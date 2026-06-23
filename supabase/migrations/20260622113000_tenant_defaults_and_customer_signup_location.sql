-- Tenant defaults and customer signup location capture.
-- 1) Any newly-created tenant receives default app settings, services, and service areas.
-- 2) Customer self-signup stores address/location into customers.

CREATE OR REPLACE FUNCTION public.seed_tenant_defaults(_tenant_id uuid, _tenant_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_settings (tenant_id, business_name)
  VALUES (_tenant_id, COALESCE(_tenant_name, 'مغسلة'))
  ON CONFLICT DO NOTHING;

  -- Copy the distinct catalogue from existing tenants into the new tenant.
  INSERT INTO public.service_items (tenant_id, name, service_type, unit_price, is_active, category_id)
  SELECT _tenant_id, x.name, x.service_type, x.unit_price, x.is_active, NULL
  FROM (
    SELECT DISTINCT ON (name) name, service_type, unit_price, is_active
    FROM public.service_items
    WHERE tenant_id IS NOT NULL AND tenant_id <> _tenant_id
    ORDER BY name, created_at DESC
  ) x
  WHERE NOT EXISTS (
    SELECT 1 FROM public.service_items s WHERE s.tenant_id = _tenant_id AND s.name = x.name
  );

  INSERT INTO public.service_areas (tenant_id, name, area_type, aliases, lat, lng, default_delivery_fee, is_active, notes)
  SELECT _tenant_id, x.name, x.area_type, x.aliases, x.lat, x.lng, x.default_delivery_fee, x.is_active, x.notes
  FROM (
    SELECT DISTINCT ON (name) name, area_type, aliases, lat, lng, default_delivery_fee, is_active, notes, created_at
    FROM public.service_areas
    WHERE tenant_id IS NOT NULL AND tenant_id <> _tenant_id
    ORDER BY name, created_at DESC
  ) x
  WHERE NOT EXISTS (
    SELECT 1 FROM public.service_areas a WHERE a.tenant_id = _tenant_id AND a.name = x.name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.after_tenant_created_seed_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_tenant_defaults(NEW.id, NEW.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_tenant_defaults ON public.tenants;
CREATE TRIGGER trg_seed_tenant_defaults
AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.after_tenant_created_seed_defaults();

-- Ensure all existing tenants also have defaults.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, name FROM public.tenants LOOP
    PERFORM public.seed_tenant_defaults(r.id, r.name);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_role text;
  meta_tenant uuid;
  meta_phone text;
  meta_name text;
  meta_address text;
  meta_location_url text;
  meta_lat double precision;
  meta_lng double precision;
BEGIN
  meta_role := COALESCE(NEW.raw_user_meta_data->>'role', '');
  meta_tenant := NULLIF(NEW.raw_user_meta_data->>'tenant_id', '')::uuid;
  meta_phone := NEW.raw_user_meta_data->>'phone';
  meta_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  meta_address := NEW.raw_user_meta_data->>'address';
  meta_location_url := NEW.raw_user_meta_data->>'location_url';
  meta_lat := NULLIF(NEW.raw_user_meta_data->>'lat', '')::double precision;
  meta_lng := NULLIF(NEW.raw_user_meta_data->>'lng', '')::double precision;

  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, meta_name, meta_phone)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  IF meta_role = 'customer' AND meta_tenant IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (NEW.id, 'customer', meta_tenant)
    ON CONFLICT DO NOTHING;

    IF meta_phone IS NOT NULL AND length(regexp_replace(meta_phone, '\D', '', 'g')) >= 11 THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.customers
        WHERE tenant_id = meta_tenant AND phone = meta_phone
      ) THEN
        INSERT INTO public.customers (tenant_id, full_name, phone, email, address, lat, lng, location_url, notes)
        VALUES (meta_tenant, meta_name, meta_phone, NEW.email, meta_address, meta_lat, meta_lng, meta_location_url, 'تسجيل ذاتي من رابط العميل');
      ELSE
        UPDATE public.customers
        SET
          email = COALESCE(email, NEW.email),
          full_name = COALESCE(NULLIF(full_name,''), meta_name),
          address = COALESCE(NULLIF(address,''), meta_address),
          lat = COALESCE(lat, meta_lat),
          lng = COALESCE(lng, meta_lng),
          location_url = COALESCE(NULLIF(location_url,''), meta_location_url)
        WHERE tenant_id = meta_tenant AND phone = meta_phone;
      END IF;
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (NEW.id, 'super_admin', NULL);
  END IF;

  RETURN NEW;
END;
$$;
