-- MJRH — Enterprise Core: Scalable for hotels, hospitals, 50+ branch chains
-- Adds enterprises table, parent relationship, custom fields, scalability indexes

-- 1) Enterprises table (group of projects/tenants under one holding)
CREATE TABLE IF NOT EXISTS public.enterprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_user_id UUID REFERENCES auth.users(id),
  industry_type TEXT DEFAULT 'hospitality' CHECK (industry_type IN ('hospitality', 'healthcare', 'food_chain', 'retail_chain', 'laundry_chain', 'generic')),
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.enterprises IS 'Enterprise grouping multiple tenants/projects, e.g., a hotel chain with 10 hotels, each hotel is a tenant with 5 branches';

ALTER TABLE public.enterprises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS enterprises_owner_all ON public.enterprises;
CREATE POLICY enterprises_owner_all ON public.enterprises
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (owner_user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_enterprises_owner ON public.enterprises (owner_user_id) WHERE is_active = true;

GRANT ALL ON public.enterprises TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprises TO authenticated;

-- 2) Link tenants to enterprise (optional)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS enterprise_id UUID REFERENCES public.enterprises(id) ON DELETE SET NULL;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS parent_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS custom_config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.tenants.enterprise_id IS 'If tenant belongs to an enterprise group (e.g., hotel chain)';
COMMENT ON COLUMN public.tenants.parent_tenant_id IS 'For hierarchical tenants: main tenant → sub-tenants';
COMMENT ON COLUMN public.tenants.custom_config IS 'Per-client customization: custom fields, workflows, reports, etc. Allows tailoring without code change';

CREATE INDEX IF NOT EXISTS idx_tenants_enterprise ON public.tenants (enterprise_id) WHERE enterprise_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_parent ON public.tenants (parent_tenant_id) WHERE parent_tenant_id IS NOT NULL;

-- 3) Enhance branches for enterprise scale (50+ branches)
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS branch_code TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS custom_config JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_branches_region ON public.branches (tenant_id, region) WHERE region IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_branches_code ON public.branches (tenant_id, branch_code) WHERE branch_code IS NOT NULL;

-- 4) Enhance orders/jobs for enterprise reporting
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS enterprise_id UUID REFERENCES public.enterprises(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_enterprise ON public.orders (enterprise_id, created_at DESC) WHERE enterprise_id IS NOT NULL;

-- 5) Custom fields definition per tenant (for per-client tailoring)
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'service_unit', 'customer', 'employee', 'branch')),
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_label_en TEXT,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select', 'multiselect')),
  options JSONB DEFAULT '[]'::jsonb,
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, entity_type, field_key)
);

COMMENT ON TABLE public.custom_field_definitions IS 'Per-tenant custom fields for tailoring without code change, e.g., hotel room number, patient ID, etc.';

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS custom_fields_tenant_all ON public.custom_field_definitions;
CREATE POLICY custom_fields_tenant_all ON public.custom_field_definitions
  FOR ALL TO authenticated
  USING (public.can_access_tenant(tenant_id))
  WITH CHECK (public.can_access_tenant(tenant_id));

GRANT ALL ON public.custom_field_definitions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_definitions TO authenticated;

-- 6) Update seed_tenant_defaults to handle enterprise core
CREATE OR REPLACE FUNCTION public.seed_tenant_defaults(_tenant_id uuid, _tenant_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  btype text;
  copied_count integer := 0;
BEGIN
  SELECT COALESCE(business_type, 'laundry') INTO btype FROM public.tenants WHERE id = _tenant_id;

  INSERT INTO public.app_settings (tenant_id, business_name)
  VALUES (_tenant_id, COALESCE(_tenant_name, 'Business'))
  ON CONFLICT (tenant_id) DO UPDATE SET business_name = COALESCE(public.app_settings.business_name, EXCLUDED.business_name);

  PERFORM public.ensure_default_branch_for(_tenant_id, _tenant_name);
  PERFORM public.ensure_default_cash_account_for(_tenant_id);
  PERFORM public.ensure_default_chart_accounts_for(_tenant_id);
  PERFORM public.ensure_default_workflow_for(_tenant_id);

  -- Ensure default categories
  INSERT INTO public.service_categories (tenant_id, name, slug, sort_order)
  VALUES
    (_tenant_id, 'عام', 'general', 0),
    (_tenant_id, 'رجالي', 'men', 1),
    (_tenant_id, 'حريمي', 'women', 2),
    (_tenant_id, 'أطفال', 'kids', 3),
    (_tenant_id, 'مفروشات', 'linens', 4),
    (_tenant_id, 'إصلاحات', 'repairs', 5)
  ON CONFLICT (tenant_id, slug) DO NOTHING;

  IF btype = 'laundry' THEN
    INSERT INTO public.service_items (tenant_id, name, service_type, unit_price, is_active, category_id)
    SELECT _tenant_id, x.name, x.service_type, x.unit_price, x.is_active, NULL
    FROM (
      SELECT DISTINCT ON (name, service_type) name, service_type, unit_price, is_active
      FROM public.service_items
      WHERE tenant_id IS NOT NULL AND tenant_id <> _tenant_id
      ORDER BY name, service_type, created_at DESC
    ) x
    WHERE NOT EXISTS (
      SELECT 1 FROM public.service_items s WHERE s.tenant_id = _tenant_id AND s.name = x.name AND s.service_type = x.service_type
    );
    GET DIAGNOSTICS copied_count = ROW_COUNT;
    PERFORM public.seed_laundry_service_catalog(_tenant_id);
  ELSE
    INSERT INTO public.service_items (tenant_id, name, service_type, unit_price, is_active, category_id)
    SELECT _tenant_id, x.name, x.service_type, x.unit_price, x.is_active, NULL
    FROM (
      SELECT DISTINCT ON (name) name, service_type, unit_price, is_active
      FROM public.service_items
      WHERE tenant_id IS NOT NULL AND tenant_id <> _tenant_id
      ORDER BY name, created_at DESC
    ) x
    WHERE NOT EXISTS (SELECT 1 FROM public.service_items s WHERE s.tenant_id = _tenant_id AND s.name = x.name);
  END IF;

  INSERT INTO public.tenant_features(tenant_id, feature_key, enabled)
  VALUES
    (_tenant_id,'orders',true),
    (_tenant_id,'customer_portal',true),
    (_tenant_id,'driver_map',true),
    (_tenant_id,'inventory',true),
    (_tenant_id,'accounting',true),
    (_tenant_id,'cash_closing',true),
    (_tenant_id,'apdo',true),
    (_tenant_id,'customer_returns',true),
    (_tenant_id,'ironing_distribution',true),
    (_tenant_id,'payment_proofs',true)
  ON CONFLICT (tenant_id, feature_key) DO UPDATE SET enabled = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_tenant_defaults(uuid, text) TO authenticated;

-- 7) RPC to create enterprise with first tenant
CREATE OR REPLACE FUNCTION public.create_enterprise_with_tenant(
  _enterprise_name TEXT,
  _enterprise_slug TEXT,
  _industry_type TEXT DEFAULT 'generic',
  _tenant_name TEXT DEFAULT NULL,
  _tenant_slug TEXT DEFAULT NULL,
  _owner_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _enterprise_id UUID;
  _tenant_id UUID;
  _user_id UUID;
BEGIN
  _user_id := COALESCE(_owner_user_id, auth.uid());
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  INSERT INTO public.enterprises (name, slug, industry_type, owner_user_id)
  VALUES (_enterprise_name, _enterprise_slug, _industry_type, _user_id)
  RETURNING id INTO _enterprise_id;

  IF _tenant_name IS NOT NULL AND _tenant_slug IS NOT NULL THEN
    INSERT INTO public.tenants (name, slug, business_type, owner_user_id, enterprise_id, is_active)
    VALUES (_tenant_name, _tenant_slug, 'generic', _user_id, _enterprise_id, true)
    RETURNING id INTO _tenant_id;

    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (_user_id, 'owner', _tenant_id)
    ON CONFLICT DO NOTHING;

    PERFORM public.seed_tenant_defaults(_tenant_id, _tenant_name);
  END IF;

  RETURN _enterprise_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_enterprise_with_tenant(TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

-- 8) View for enterprise central reporting (50+ branches)
CREATE OR REPLACE VIEW public.enterprise_branch_summary WITH (security_invoker = true) AS
SELECT
  e.id as enterprise_id,
  e.name as enterprise_name,
  t.id as tenant_id,
  t.name as tenant_name,
  b.id as branch_id,
  b.name as branch_name,
  b.region,
  (SELECT count(*) FROM public.orders WHERE branch_id = b.id AND status != 'cancelled') as total_orders,
  (SELECT count(*) FROM public.orders WHERE branch_id = b.id AND status = 'delivered') as delivered_orders,
  (SELECT COALESCE(SUM(total),0) FROM public.orders WHERE branch_id = b.id AND status = 'delivered') as total_revenue
FROM public.enterprises e
JOIN public.tenants t ON t.enterprise_id = e.id
JOIN public.branches b ON b.tenant_id = t.id
WHERE b.is_active = true;

GRANT SELECT ON public.enterprise_branch_summary TO authenticated;
