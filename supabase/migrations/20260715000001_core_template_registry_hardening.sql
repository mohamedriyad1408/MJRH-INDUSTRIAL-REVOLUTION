-- MJRH Core Platform Hardening
-- Protect the Core from embedded business structure. The Core owns capabilities;
-- templates own departments, roles, workflows, and financial event assets.

-- ============================================================================
-- 1) Template Registry foundation
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_template_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text,
  description_en text,
  category text NOT NULL DEFAULT 'foundation' CHECK (category IN ('foundation','industry_package','customer_private')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','placeholder','archived')),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((category = 'customer_private' AND tenant_id IS NOT NULL) OR (category <> 'customer_private'))
);

CREATE TABLE IF NOT EXISTS public.core_template_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.core_template_registry(id) ON DELETE CASCADE,
  asset_type text NOT NULL CHECK (asset_type IN ('department','role','workflow','financial_event','document','form','navigation')),
  asset_key text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, asset_type, asset_key)
);

CREATE INDEX IF NOT EXISTS idx_core_template_registry_tenant ON public.core_template_registry(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_template_assets_template ON public.core_template_assets(template_id, asset_type);

ALTER TABLE public.core_template_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_template_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_template_registry_read ON public.core_template_registry;
CREATE POLICY core_template_registry_read ON public.core_template_registry
FOR SELECT TO authenticated
USING (
  (tenant_id IS NULL AND status IN ('active','placeholder'))
  OR (tenant_id IS NOT NULL AND public.can_access_tenant(tenant_id))
);

DROP POLICY IF EXISTS core_template_registry_write_private ON public.core_template_registry;
CREATE POLICY core_template_registry_write_private ON public.core_template_registry
FOR ALL TO authenticated
USING (tenant_id IS NOT NULL AND public.can_access_tenant(tenant_id))
WITH CHECK (tenant_id IS NOT NULL AND public.can_access_tenant(tenant_id));

DROP POLICY IF EXISTS core_template_assets_read ON public.core_template_assets;
CREATE POLICY core_template_assets_read ON public.core_template_assets
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.core_template_registry r
    WHERE r.id = template_id
      AND ((r.tenant_id IS NULL AND r.status IN ('active','placeholder')) OR (r.tenant_id IS NOT NULL AND public.can_access_tenant(r.tenant_id)))
  )
);

DROP POLICY IF EXISTS core_template_assets_write_private ON public.core_template_assets;
CREATE POLICY core_template_assets_write_private ON public.core_template_assets
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.core_template_registry r WHERE r.id = template_id AND r.tenant_id IS NOT NULL AND public.can_access_tenant(r.tenant_id))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.core_template_registry r WHERE r.id = template_id AND r.tenant_id IS NOT NULL AND public.can_access_tenant(r.tenant_id))
);

DROP TRIGGER IF EXISTS trg_core_template_registry_updated ON public.core_template_registry;
CREATE TRIGGER trg_core_template_registry_updated
BEFORE UPDATE ON public.core_template_registry
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

DROP TRIGGER IF EXISTS trg_core_template_assets_updated ON public.core_template_assets;
CREATE TRIGGER trg_core_template_assets_updated
BEFORE UPDATE ON public.core_template_assets
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

-- Record template metadata on setup profile without forcing any Core defaults.
ALTER TABLE public.core_setup_profiles ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.core_template_registry(id);
ALTER TABLE public.core_setup_profiles ADD COLUMN IF NOT EXISTS template_slug text;

-- Seed only registry examples and generic financial events. No industry structure is seeded.
WITH tpl AS (
  INSERT INTO public.core_template_registry (slug, name_ar, name_en, description_ar, description_en, category, status, metadata)
  VALUES
    ('blank_operating_system', 'نظام تشغيل فارغ', 'Blank Operating System', 'قالب بلا هيكل أعمال مفترض.', 'Template with no assumed business structure.', 'foundation', 'active', '{"core_defaults":false}'::jsonb),
    ('generic_operating_organization', 'منظمة تشغيل عامة', 'Generic Operating Organization', 'قالب عام قابل للتعديل قبل التوليد.', 'Generic editable organization template.', 'foundation', 'active', '{"core_defaults":false}'::jsonb),
    ('laundry', 'Laundry', 'Laundry', 'حزمة صناعة مستقبلية من Marketplace.', 'Future Marketplace industry package.', 'industry_package', 'placeholder', '{"assets_embedded":false}'::jsonb),
    ('hotel', 'Hotel', 'Hotel', 'حزمة صناعة مستقبلية من Marketplace.', 'Future Marketplace industry package.', 'industry_package', 'placeholder', '{"assets_embedded":false}'::jsonb),
    ('hospital', 'Hospital', 'Hospital', 'حزمة صناعة مستقبلية من Marketplace.', 'Future Marketplace industry package.', 'industry_package', 'placeholder', '{"assets_embedded":false}'::jsonb),
    ('manufacturing', 'Manufacturing', 'Manufacturing', 'حزمة صناعة مستقبلية من Marketplace.', 'Future Marketplace industry package.', 'industry_package', 'placeholder', '{"assets_embedded":false}'::jsonb),
    ('construction', 'Construction', 'Construction', 'حزمة صناعة مستقبلية من Marketplace.', 'Future Marketplace industry package.', 'industry_package', 'placeholder', '{"assets_embedded":false}'::jsonb),
    ('logistics', 'Logistics', 'Logistics', 'حزمة صناعة مستقبلية من Marketplace.', 'Future Marketplace industry package.', 'industry_package', 'placeholder', '{"assets_embedded":false}'::jsonb),
    ('retail', 'Retail', 'Retail', 'حزمة صناعة مستقبلية من Marketplace.', 'Future Marketplace industry package.', 'industry_package', 'placeholder', '{"assets_embedded":false}'::jsonb)
  ON CONFLICT (slug) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    description_ar = EXCLUDED.description_ar,
    description_en = EXCLUDED.description_en,
    category = EXCLUDED.category,
    status = EXCLUDED.status,
    metadata = public.core_template_registry.metadata || EXCLUDED.metadata
  RETURNING id, slug
), generic_tpl AS (
  SELECT id FROM public.core_template_registry WHERE slug IN ('blank_operating_system','generic_operating_organization')
), financial_events AS (
  SELECT * FROM (VALUES
    ('transaction','معاملة','Transaction','{"approval_required":false}'::jsonb,10),
    ('adjustment','تسوية','Adjustment','{"approval_required":true}'::jsonb,20),
    ('allocation','تخصيص','Allocation','{"approval_required":false}'::jsonb,30),
    ('settlement','إقفال/تسوية نهائية','Settlement','{"approval_required":true}'::jsonb,40),
    ('approval','اعتماد','Approval','{"approval_required":true}'::jsonb,50),
    ('transfer','تحويل','Transfer','{"approval_required":true}'::jsonb,60)
  ) AS x(asset_key, name_ar, name_en, definition, sort_order)
)
INSERT INTO public.core_template_assets (template_id, asset_type, asset_key, name_ar, name_en, definition, sort_order)
SELECT g.id, 'financial_event', f.asset_key, f.name_ar, f.name_en, f.definition, f.sort_order
FROM generic_tpl g CROSS JOIN financial_events f
ON CONFLICT (template_id, asset_type, asset_key) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  definition = EXCLUDED.definition,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- ============================================================================
-- 2) Harden setup generator: template-driven, generic, idempotent, isolated
-- ============================================================================

CREATE OR REPLACE FUNCTION public.complete_mjrh_core_setup(_tenant_id uuid, _setup jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dep jsonb;
  role_row jsonb;
  workflow_row jsonb;
  fin_row jsonb;
  br jsonb;
  org jsonb := COALESCE(_setup->'organization', '{}'::jsonb);
  assets jsonb := COALESCE(_setup->'template_assets', '{}'::jsonb);
  _user uuid := auth.uid();
  _org_name text := COALESCE(NULLIF(org->>'name',''), (SELECT name FROM public.tenants WHERE id = _tenant_id), 'Organization');
  _currency text := COALESCE(NULLIF(org->>'currency',''), 'EGP');
  _template_slug text := COALESCE(NULLIF(_setup->>'template_slug',''), 'blank_operating_system');
  _template_id uuid;
  _dept_count int := 0;
  _role_count int := 0;
  _workflow_count int := 0;
  _financial_count int := 0;
BEGIN
  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id is required';
  END IF;

  IF NOT public.can_access_tenant(_tenant_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT id INTO _template_id
  FROM public.core_template_registry
  WHERE slug = _template_slug
    AND (tenant_id IS NULL OR public.can_access_tenant(tenant_id))
  LIMIT 1;

  IF _template_id IS NULL THEN
    SELECT id INTO _template_id FROM public.core_template_registry WHERE slug = 'blank_operating_system' LIMIT 1;
  END IF;

  -- If caller did not pass assets, hydrate them from the selected template registry.
  IF assets = '{}'::jsonb AND _template_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'departments', COALESCE(jsonb_agg(jsonb_build_object('key', asset_key, 'name_ar', name_ar, 'name_en', name_en, 'enabled', true) ORDER BY sort_order) FILTER (WHERE asset_type='department'), '[]'::jsonb),
      'roles', COALESCE(jsonb_agg(jsonb_build_object('key', asset_key, 'name_ar', name_ar, 'name_en', name_en, 'approval_level', COALESCE((definition->>'approval_level')::int,0), 'permissions', definition) ORDER BY sort_order) FILTER (WHERE asset_type='role'), '[]'::jsonb),
      'workflows', COALESCE(jsonb_agg(jsonb_build_object('key', asset_key, 'name_ar', name_ar, 'name_en', name_en, 'style', COALESCE(definition->>'style','template_defined'), 'definition', definition) ORDER BY sort_order) FILTER (WHERE asset_type='workflow'), '[]'::jsonb),
      'financial_events', COALESCE(jsonb_agg(jsonb_build_object('key', asset_key, 'name_ar', name_ar, 'name_en', name_en, 'accounting_rule', definition, 'approval_required', COALESCE((definition->>'approval_required')::boolean,false)) ORDER BY sort_order) FILTER (WHERE asset_type='financial_event'), '[]'::jsonb)
    ) INTO assets
    FROM public.core_template_assets
    WHERE template_id = _template_id AND is_active;
  END IF;

  UPDATE public.tenants
  SET name = _org_name,
      business_type = COALESCE(NULLIF(org->>'business_type',''), 'configured_by_template'),
      industry_profile = COALESCE(industry_profile, '{}'::jsonb)
        || jsonb_build_object(
          'core_platform', true,
          'template_slug', _template_slug,
          'industry', org->>'industry',
          'business_type', org->>'business_type',
          'configured_by_setup_wizard', true,
          'configured_at', now()
        )
  WHERE id = _tenant_id;

  INSERT INTO public.app_settings (tenant_id, business_name, currency)
  VALUES (_tenant_id, _org_name, _currency)
  ON CONFLICT (tenant_id) DO UPDATE SET business_name = EXCLUDED.business_name, currency = EXCLUDED.currency;

  INSERT INTO public.core_setup_profiles (
    tenant_id, template_id, template_slug, status, organization, branches, working_hours, tax, operational_model,
    workflow_style, accounting, notifications, document_numbering, approvals, branding,
    raw_setup, completed_by, completed_at
  ) VALUES (
    _tenant_id, _template_id, _template_slug, 'completed', org, COALESCE(_setup->'branches','[]'::jsonb),
    COALESCE(_setup->'working_hours','{}'::jsonb), COALESCE(_setup->'tax','{}'::jsonb),
    _setup->>'operational_model', _setup->>'workflow_style', COALESCE(_setup->'accounting','{}'::jsonb),
    COALESCE(_setup->'notifications','{}'::jsonb), COALESCE(_setup->'document_numbering','{}'::jsonb),
    COALESCE(_setup->'approvals','[]'::jsonb), COALESCE(_setup->'branding','{}'::jsonb),
    _setup || jsonb_build_object('template_assets', assets), _user, now()
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    template_id = EXCLUDED.template_id,
    template_slug = EXCLUDED.template_slug,
    status = 'completed', organization = EXCLUDED.organization, branches = EXCLUDED.branches,
    working_hours = EXCLUDED.working_hours, tax = EXCLUDED.tax, operational_model = EXCLUDED.operational_model,
    workflow_style = EXCLUDED.workflow_style, accounting = EXCLUDED.accounting,
    notifications = EXCLUDED.notifications, document_numbering = EXCLUDED.document_numbering,
    approvals = EXCLUDED.approvals, branding = EXCLUDED.branding, raw_setup = EXCLUDED.raw_setup,
    completed_by = EXCLUDED.completed_by, completed_at = now();

  FOR br IN SELECT * FROM jsonb_array_elements(COALESCE(_setup->'branches','[]'::jsonb)) LOOP
    IF NULLIF(br->>'name','') IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.tenant_id = _tenant_id AND lower(trim(b.name)) = lower(trim(br->>'name'))
    ) THEN
      INSERT INTO public.branches (tenant_id, name, is_active)
      VALUES (_tenant_id, br->>'name', true);
    END IF;
  END LOOP;

  FOR dep IN SELECT * FROM jsonb_array_elements(COALESCE(assets->'departments','[]'::jsonb)) LOOP
    IF NULLIF(dep->>'key','') IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.core_departments (tenant_id, department_key, name_ar, name_en, is_default, sort_order, config)
    VALUES (
      _tenant_id,
      dep->>'key',
      COALESCE(NULLIF(dep->>'name_ar',''), dep->>'key'),
      COALESCE(NULLIF(dep->>'name_en',''), dep->>'key'),
      false,
      _dept_count * 10,
      dep
    )
    ON CONFLICT (tenant_id, department_key) DO UPDATE SET
      name_ar = EXCLUDED.name_ar,
      name_en = EXCLUDED.name_en,
      is_default = false,
      is_active = true,
      config = EXCLUDED.config,
      sort_order = EXCLUDED.sort_order;

    IF NULLIF(dep->>'route','') IS NOT NULL THEN
      INSERT INTO public.core_navigation_items (tenant_id, department_key, item_key, label_ar, label_en, route, icon, sort_order, config)
      VALUES (
        _tenant_id,
        dep->>'key',
        (dep->>'key') || '_workspace',
        COALESCE(NULLIF(dep->>'name_ar',''), dep->>'key'),
        COALESCE(NULLIF(dep->>'name_en',''), dep->>'key'),
        dep->>'route',
        COALESCE(NULLIF(dep->>'icon',''), 'LayoutDashboard'),
        _dept_count * 10,
        dep
      )
      ON CONFLICT (tenant_id, item_key) DO UPDATE SET
        label_ar = EXCLUDED.label_ar,
        label_en = EXCLUDED.label_en,
        route = EXCLUDED.route,
        icon = EXCLUDED.icon,
        config = EXCLUDED.config,
        is_active = true,
        sort_order = EXCLUDED.sort_order;
    END IF;

    _dept_count := _dept_count + 1;
  END LOOP;

  FOR role_row IN SELECT * FROM jsonb_array_elements(COALESCE(assets->'roles','[]'::jsonb)) LOOP
    IF NULLIF(role_row->>'key','') IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.core_roles (tenant_id, role_key, name_ar, name_en, approval_level, permissions)
    VALUES (
      _tenant_id,
      role_row->>'key',
      COALESCE(NULLIF(role_row->>'name_ar',''), role_row->>'key'),
      COALESCE(NULLIF(role_row->>'name_en',''), role_row->>'key'),
      COALESCE((role_row->>'approval_level')::int, 0),
      COALESCE(role_row->'permissions', role_row)
    )
    ON CONFLICT (tenant_id, role_key) DO UPDATE SET
      name_ar = EXCLUDED.name_ar,
      name_en = EXCLUDED.name_en,
      approval_level = EXCLUDED.approval_level,
      permissions = EXCLUDED.permissions,
      is_active = true;

    _role_count := _role_count + 1;
  END LOOP;

  FOR workflow_row IN SELECT * FROM jsonb_array_elements(COALESCE(assets->'workflows','[]'::jsonb)) LOOP
    IF NULLIF(workflow_row->>'key','') IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.core_workflow_blueprints (tenant_id, blueprint_key, name_ar, name_en, style, definition)
    VALUES (
      _tenant_id,
      workflow_row->>'key',
      COALESCE(NULLIF(workflow_row->>'name_ar',''), workflow_row->>'key'),
      COALESCE(NULLIF(workflow_row->>'name_en',''), workflow_row->>'key'),
      COALESCE(NULLIF(workflow_row->>'style',''), 'template_defined'),
      COALESCE(workflow_row->'definition', '{}'::jsonb)
    )
    ON CONFLICT (tenant_id, blueprint_key) DO UPDATE SET
      name_ar = EXCLUDED.name_ar,
      name_en = EXCLUDED.name_en,
      style = EXCLUDED.style,
      definition = EXCLUDED.definition,
      is_active = true;

    _workflow_count := _workflow_count + 1;
  END LOOP;

  FOR fin_row IN SELECT * FROM jsonb_array_elements(COALESCE(assets->'financial_events','[]'::jsonb)) LOOP
    IF NULLIF(fin_row->>'key','') IS NULL THEN CONTINUE; END IF;

    IF lower(fin_row->>'key') ~ '(laundry|wash|hotel|garment|factory|hospital|restaurant)' OR lower(fin_row->>'name_en') ~ '(laundry|wash|hotel|garment|factory|hospital|restaurant)' THEN
      RAISE EXCEPTION 'Financial event type must be industry-neutral: %', fin_row->>'key';
    END IF;

    INSERT INTO public.core_financial_event_types (tenant_id, event_key, name_ar, name_en, accounting_rule, approval_required)
    VALUES (
      _tenant_id,
      fin_row->>'key',
      COALESCE(NULLIF(fin_row->>'name_ar',''), fin_row->>'key'),
      COALESCE(NULLIF(fin_row->>'name_en',''), fin_row->>'key'),
      COALESCE(fin_row->'accounting_rule', '{}'::jsonb),
      COALESCE((fin_row->>'approval_required')::boolean, false)
    )
    ON CONFLICT (tenant_id, event_key) DO UPDATE SET
      name_ar = EXCLUDED.name_ar,
      name_en = EXCLUDED.name_en,
      accounting_rule = EXCLUDED.accounting_rule,
      approval_required = EXCLUDED.approval_required,
      is_active = true;

    _financial_count := _financial_count + 1;
  END LOOP;

  INSERT INTO public.tenant_onboarding (tenant_id, current_step, completed_steps, branch_data, catalog_choice, staff_data, payment_method, is_completed, completed_at)
  VALUES (
    _tenant_id, 8, '[1,2,3,4,5,6,7,8]'::jsonb, COALESCE(_setup->'branches','[]'::jsonb),
    'manual', COALESCE(assets->'roles','[]'::jsonb), COALESCE(_setup->'accounting'->>'basis','cash'), true, now()
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    current_step = 8,
    completed_steps = '[1,2,3,4,5,6,7,8]'::jsonb,
    branch_data = EXCLUDED.branch_data,
    staff_data = EXCLUDED.staff_data,
    payment_method = EXCLUDED.payment_method,
    is_completed = true,
    completed_at = now();

  INSERT INTO public.tenant_features(tenant_id, feature_key, enabled)
  VALUES
    (_tenant_id,'core_platform',true),
    (_tenant_id,'template_registry',true),
    (_tenant_id,'configuration_engine',true),
    (_tenant_id,'organization_engine',true),
    (_tenant_id,'department_engine',true),
    (_tenant_id,'workflow_engine',true),
    (_tenant_id,'actor_engine',true),
    (_tenant_id,'task_engine',true),
    (_tenant_id,'financial_engine',true),
    (_tenant_id,'notification_engine',true),
    (_tenant_id,'reporting_engine',true),
    (_tenant_id,'permissions_engine',true)
  ON CONFLICT (tenant_id, feature_key) DO UPDATE SET enabled = true;

  RETURN jsonb_build_object(
    'tenant_id', _tenant_id,
    'status', 'completed',
    'template_slug', _template_slug,
    'departments', _dept_count,
    'roles', _role_count,
    'workflows', _workflow_count,
    'financial_events', _financial_count,
    'can_enter_platform', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_mjrh_core_setup(uuid, jsonb) TO authenticated;

COMMENT ON TABLE public.core_template_registry IS 'Registry for foundation templates, future industry packages, and tenant-private templates. Core capabilities never embed business structures.';
COMMENT ON TABLE public.core_template_assets IS 'Template-owned assets such as departments, roles, workflows, forms, documents, and generic financial events.';
COMMENT ON FUNCTION public.complete_mjrh_core_setup IS 'Idempotently generates tenant-owned platform configuration from template assets. No industry-specific Core defaults.';
