-- Tenant-specific customer signup support.

DROP POLICY IF EXISTS tenants_public_signup_read ON public.tenants;
CREATE POLICY tenants_public_signup_read ON public.tenants
FOR SELECT TO anon
USING (is_active = true);

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
BEGIN
  meta_role := COALESCE(NEW.raw_user_meta_data->>'role', '');
  meta_tenant := NULLIF(NEW.raw_user_meta_data->>'tenant_id', '')::uuid;
  meta_phone := NEW.raw_user_meta_data->>'phone';
  meta_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, meta_name, meta_phone)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  IF meta_role = 'customer' AND meta_tenant IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (NEW.id, 'customer', meta_tenant)
    ON CONFLICT DO NOTHING;

    IF meta_phone IS NOT NULL AND length(regexp_replace(meta_phone, '\\D', '', 'g')) >= 11 THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.customers
        WHERE tenant_id = meta_tenant AND phone = meta_phone
      ) THEN
        INSERT INTO public.customers (tenant_id, full_name, phone, email, notes)
        VALUES (meta_tenant, meta_name, meta_phone, NEW.email, 'تسجيل ذاتي من رابط العميل');
      ELSE
        UPDATE public.customers
        SET email = COALESCE(email, NEW.email), full_name = COALESCE(NULLIF(full_name,''), meta_name)
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
