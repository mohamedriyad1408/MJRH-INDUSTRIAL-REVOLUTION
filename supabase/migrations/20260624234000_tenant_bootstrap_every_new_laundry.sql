-- Make every new laundry fully ready: settings, services, cash safe, chart accounts, owner employee.
-- Also backfill existing tenants.

CREATE UNIQUE INDEX IF NOT EXISTS employees_tenant_email_unique
ON public.employees(tenant_id, email)
WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS employees_tenant_profile_unique
ON public.employees(tenant_id, profile_id)
WHERE profile_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.seed_tenant_defaults(_tenant_id uuid, _tenant_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_settings (tenant_id, business_name)
  VALUES (_tenant_id, COALESCE(_tenant_name, 'مغسلة'))
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Core finance defaults: always ready for accounting/cash/ledger from day one.
  PERFORM public.ensure_default_cash_account_for(_tenant_id);
  PERFORM public.ensure_default_chart_accounts_for(_tenant_id);

  -- Copy service catalogue from any existing tenant if this tenant has no catalogue yet.
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

  -- Copy service areas if any exist.
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

CREATE OR REPLACE FUNCTION public.ensure_tenant_owner_employee(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
  u record;
  owner_name text;
BEGIN
  SELECT * INTO t FROM public.tenants WHERE id = _tenant_id;
  IF t.id IS NULL OR t.owner_user_id IS NULL THEN RETURN; END IF;

  SELECT id, email, raw_user_meta_data INTO u
  FROM auth.users
  WHERE id = t.owner_user_id;

  owner_name := COALESCE(u.raw_user_meta_data->>'full_name', u.email, t.name, 'مالك المغسلة');

  INSERT INTO public.employees(
    tenant_id, profile_id, full_name, email, job_title, role, station, job_role,
    monthly_salary, commission_percent, is_active, notes
  ) VALUES (
    t.id, t.owner_user_id, owner_name, u.email, 'مالك المغسلة', 'owner', NULL, 'other',
    0, 0, true, 'تم إنشاؤه تلقائيًا مع المغسلة'
  )
  ON CONFLICT (tenant_id, email) WHERE email IS NOT NULL
  DO UPDATE SET profile_id = EXCLUDED.profile_id,
                full_name = COALESCE(public.employees.full_name, EXCLUDED.full_name),
                role = 'owner',
                updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.after_tenant_created_or_owner_changed_bootstrap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_tenant_defaults(NEW.id, NEW.name);
  PERFORM public.ensure_tenant_owner_employee(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_tenant_defaults ON public.tenants;
DROP TRIGGER IF EXISTS trg_tenant_bootstrap_all ON public.tenants;
CREATE TRIGGER trg_tenant_bootstrap_all
AFTER INSERT OR UPDATE OF owner_user_id, name ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.after_tenant_created_or_owner_changed_bootstrap();

-- Backfill all existing tenants.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, name FROM public.tenants LOOP
    PERFORM public.seed_tenant_defaults(r.id, r.name);
    PERFORM public.ensure_tenant_owner_employee(r.id);
  END LOOP;
END $$;
