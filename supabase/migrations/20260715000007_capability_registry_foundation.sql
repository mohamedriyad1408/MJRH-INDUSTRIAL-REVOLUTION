-- Sprint 1C — Capability Registry Foundation
-- Additive migration only. No historical Dry Tech business records are modified.

-- ============================================================================
-- 1) Capability Registry
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_capability_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ownership_level text NOT NULL DEFAULT 'CAPABILITY' CHECK (ownership_level IN ('CORE','CAPABILITY','TEMPLATE')),
  capability_key text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'business' CHECK (category IN ('core','business','operations','finance','people','customer','template','platform')),
  owner text NOT NULL DEFAULT 'platform',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('proposed','active','deprecated','retired')),
  installable boolean NOT NULL DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  icon text NOT NULL DEFAULT 'Layers',
  display_order int NOT NULL DEFAULT 100,
  version text NOT NULL DEFAULT '1.0.0',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.core_capability_registry IS 'Platform source catalog of reusable capabilities. Runtime organization installs are stored separately.';
COMMENT ON COLUMN public.core_capability_registry.ownership_level IS 'CORE/CAPABILITY/TEMPLATE ownership of capability definition. Runtime installs are ORGANIZATION-owned.';

CREATE INDEX IF NOT EXISTS idx_core_capability_registry_category ON public.core_capability_registry(category, display_order) WHERE enabled;
CREATE INDEX IF NOT EXISTS idx_core_capability_registry_status ON public.core_capability_registry(status) WHERE enabled;

ALTER TABLE public.core_capability_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_capability_registry_read ON public.core_capability_registry;
CREATE POLICY core_capability_registry_read ON public.core_capability_registry
FOR SELECT TO authenticated
USING (enabled = true);

DROP TRIGGER IF EXISTS trg_core_capability_registry_updated ON public.core_capability_registry;
CREATE TRIGGER trg_core_capability_registry_updated
BEFORE UPDATE ON public.core_capability_registry
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

-- ============================================================================
-- 2) Capability Dependencies
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_capability_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_key text NOT NULL REFERENCES public.core_capability_registry(capability_key) ON DELETE CASCADE,
  dependency_type text NOT NULL DEFAULT 'CAPABILITY' CHECK (dependency_type IN ('CORE','CAPABILITY')),
  dependency_key text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (capability_key, dependency_type, dependency_key)
);

COMMENT ON TABLE public.core_capability_dependencies IS 'Explicit dependency graph for capability installation and future version compatibility.';

CREATE INDEX IF NOT EXISTS idx_core_capability_dependencies_capability ON public.core_capability_dependencies(capability_key);

ALTER TABLE public.core_capability_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_capability_dependencies_read ON public.core_capability_dependencies;
CREATE POLICY core_capability_dependencies_read ON public.core_capability_dependencies
FOR SELECT TO authenticated
USING (true);

-- ============================================================================
-- 3) Template Capability Composition
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_template_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_slug text NOT NULL REFERENCES public.core_template_registry(slug) ON DELETE CASCADE,
  capability_key text NOT NULL REFERENCES public.core_capability_registry(capability_key),
  ownership_level text NOT NULL DEFAULT 'TEMPLATE' CHECK (ownership_level = 'TEMPLATE'),
  required boolean NOT NULL DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  install_order int NOT NULL DEFAULT 100,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_slug, capability_key)
);

COMMENT ON TABLE public.core_template_capabilities IS 'TEMPLATE-owned composition rules: which capabilities a template installs by default.';

CREATE INDEX IF NOT EXISTS idx_core_template_capabilities_template ON public.core_template_capabilities(template_slug, install_order) WHERE enabled;

ALTER TABLE public.core_template_capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_template_capabilities_read ON public.core_template_capabilities;
CREATE POLICY core_template_capabilities_read ON public.core_template_capabilities
FOR SELECT TO authenticated
USING (enabled = true);

DROP TRIGGER IF EXISTS trg_core_template_capabilities_updated ON public.core_template_capabilities;
CREATE TRIGGER trg_core_template_capabilities_updated
BEFORE UPDATE ON public.core_template_capabilities
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

-- ============================================================================
-- 4) Organization Installed Capabilities
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_organization_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  capability_key text NOT NULL REFERENCES public.core_capability_registry(capability_key),
  ownership_level text NOT NULL DEFAULT 'ORGANIZATION' CHECK (ownership_level = 'ORGANIZATION'),
  status text NOT NULL DEFAULT 'enabled' CHECK (status IN ('installed','enabled','disabled','failed','removed')),
  installed_version text NOT NULL DEFAULT '1.0.0',
  source_template_slug text,
  source text NOT NULL DEFAULT 'platform_generator',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  installed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, capability_key)
);

COMMENT ON TABLE public.core_organization_capabilities IS 'ORGANIZATION-owned runtime capability installation state.';

CREATE INDEX IF NOT EXISTS idx_core_org_capabilities_tenant ON public.core_organization_capabilities(tenant_id, status);

ALTER TABLE public.core_organization_capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_organization_capabilities_tenant_all ON public.core_organization_capabilities;
CREATE POLICY core_organization_capabilities_tenant_all ON public.core_organization_capabilities
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

DROP TRIGGER IF EXISTS trg_core_organization_capabilities_updated ON public.core_organization_capabilities;
CREATE TRIGGER trg_core_organization_capabilities_updated
BEFORE UPDATE ON public.core_organization_capabilities
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

-- ============================================================================
-- 5) Link existing Navigation/Permission Assets to capabilities
-- ============================================================================

ALTER TABLE public.core_navigation_assets
  ADD COLUMN IF NOT EXISTS capability_key text;

ALTER TABLE public.core_permission_assets
  ADD COLUMN IF NOT EXISTS capability_registry_key text;

-- Backfill capability ownership for existing assets.
UPDATE public.core_navigation_assets
SET capability_key = CASE
  WHEN ownership_level = 'CORE' THEN 'core'
  WHEN ownership_level = 'CAPABILITY' THEN owner_key
  WHEN ownership_level = 'TEMPLATE' AND owner_key = 'laundry' THEN 'laundry'
  ELSE COALESCE(capability_key, owner_key)
END
WHERE capability_key IS NULL;

UPDATE public.core_permission_assets
SET capability_registry_key = CASE
  WHEN ownership_level = 'CORE' THEN 'core'
  WHEN ownership_level = 'CAPABILITY' THEN owner_key
  WHEN ownership_level = 'TEMPLATE' AND owner_key = 'laundry' THEN 'laundry'
  ELSE COALESCE(capability_registry_key, owner_key)
END
WHERE capability_registry_key IS NULL;

-- ============================================================================
-- 6) Seed capability registry
-- ============================================================================

INSERT INTO public.core_capability_registry (ownership_level, capability_key, name_ar, name_en, description, category, owner, icon, display_order, metadata)
VALUES
  ('CORE','core','النواة','Core','Core platform runtime capability required by every installation.','core','platform','Layers',1,'{}'),
  ('CAPABILITY','orders','العمليات التجارية','Orders','Customer-facing commercial order capability.','business','platform','ListOrdered',100,'{}'),
  ('CAPABILITY','crm','العملاء والعلاقات','CRM','Customer relationship and customer history capability.','customer','platform','Users',110,'{}'),
  ('CAPABILITY','catalog','الخدمات والكتالوج','Catalog','Service/product catalog and branch/catalog management capability.','business','platform','Tag',120,'{}'),
  ('CAPABILITY','workflow','سير العمل والمهام','Workflow','Workflows, work orders, tasks, operational issues and health.','operations','platform','Workflow',130,'{}'),
  ('CAPABILITY','field_service','العمل الميداني والتوصيل','Field Service','Pickup, delivery, routing, driver, and live map capability.','operations','platform','Truck',140,'{}'),
  ('CAPABILITY','accounting','المالية والمحاسبة','Accounting','Finance, accounting, ledger, receivables, cash closing and budgets.','finance','platform','Calculator',150,'{}'),
  ('CAPABILITY','reporting','التقارير واللوحات','Reporting','Reports, dashboards and intelligence views.','business','platform','BarChart3',160,'{}'),
  ('CAPABILITY','hr','الفريق والموارد البشرية','HR','Staff, attendance, payroll, requests and schedules.','people','platform','BriefcaseBusiness',170,'{}'),
  ('TEMPLATE','laundry','تشغيل المغسلة','Laundry Operations','Laundry Template-specific work areas and operational defaults.','template','laundry_template','Shirt',700,'{"template":"laundry"}'::jsonb)
ON CONFLICT (capability_key) DO UPDATE SET
  ownership_level=EXCLUDED.ownership_level,
  name_ar=EXCLUDED.name_ar,
  name_en=EXCLUDED.name_en,
  description=EXCLUDED.description,
  category=EXCLUDED.category,
  owner=EXCLUDED.owner,
  icon=EXCLUDED.icon,
  display_order=EXCLUDED.display_order,
  metadata=EXCLUDED.metadata,
  status='active',
  installable=true,
  enabled=true;

-- ============================================================================
-- 7) Seed dependencies
-- ============================================================================

INSERT INTO public.core_capability_dependencies (capability_key, dependency_type, dependency_key, required, metadata)
VALUES
  ('orders','CORE','core',true,'{}'),
  ('crm','CORE','core',true,'{}'),
  ('catalog','CORE','core',true,'{}'),
  ('workflow','CORE','core',true,'{}'),
  ('field_service','CAPABILITY','crm',true,'{}'),
  ('field_service','CAPABILITY','workflow',true,'{}'),
  ('accounting','CORE','core',true,'{}'),
  ('reporting','CORE','core',true,'{}'),
  ('hr','CORE','core',true,'{}'),
  ('laundry','CAPABILITY','crm',true,'{}'),
  ('laundry','CAPABILITY','orders',true,'{}'),
  ('laundry','CAPABILITY','workflow',true,'{}'),
  ('laundry','CAPABILITY','field_service',true,'{}'),
  ('laundry','CAPABILITY','accounting',true,'{}'),
  ('laundry','CAPABILITY','reporting',true,'{}'),
  ('laundry','CAPABILITY','catalog',true,'{}'),
  ('laundry','CAPABILITY','hr',true,'{}')
ON CONFLICT (capability_key, dependency_type, dependency_key) DO UPDATE SET
  required=EXCLUDED.required,
  metadata=EXCLUDED.metadata;

-- ============================================================================
-- 8) Laundry Template composition
-- ============================================================================

INSERT INTO public.core_template_capabilities (template_slug, capability_key, required, enabled, install_order, config)
VALUES
  ('laundry','core',true,true,1,'{}'),
  ('laundry','crm',true,true,10,'{}'),
  ('laundry','orders',true,true,20,'{}'),
  ('laundry','catalog',true,true,30,'{}'),
  ('laundry','workflow',true,true,40,'{}'),
  ('laundry','field_service',true,true,50,'{}'),
  ('laundry','accounting',true,true,60,'{}'),
  ('laundry','reporting',true,true,70,'{}'),
  ('laundry','hr',true,true,80,'{}'),
  ('laundry','laundry',true,true,90,'{"template_specific":true}'::jsonb)
ON CONFLICT (template_slug, capability_key) DO UPDATE SET
  required=EXCLUDED.required,
  enabled=EXCLUDED.enabled,
  install_order=EXCLUDED.install_order,
  config=EXCLUDED.config;

-- ============================================================================
-- 9) Integrity helper: dependency report
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_capability_dependencies(_capability_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'capability_key', _capability_key,
    'missing_dependencies', COALESCE(jsonb_agg(jsonb_build_object('dependency_type', d.dependency_type, 'dependency_key', d.dependency_key)) FILTER (WHERE d.dependency_type='CAPABILITY' AND cr.capability_key IS NULL), '[]'::jsonb),
    'valid', COALESCE(bool_and(CASE WHEN d.dependency_type='CAPABILITY' THEN cr.capability_key IS NOT NULL ELSE true END), true)
  )
  FROM public.core_capability_dependencies d
  LEFT JOIN public.core_capability_registry cr ON cr.capability_key = d.dependency_key AND cr.enabled
  WHERE d.capability_key = _capability_key;
$$;

GRANT EXECUTE ON FUNCTION public.validate_capability_dependencies(text) TO authenticated;

-- ============================================================================
-- 10) Install capabilities into an organization from template composition
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_capabilities_for_tenant(
  _tenant_id uuid,
  _template_slug text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  effective_template text;
  inserted_count int := 0;
  updated_count int := 0;
BEGIN
  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id is required';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.can_access_tenant(_tenant_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(_template_slug, template_slug, raw_setup->>'template_slug', 'blank_operating_system')
  INTO effective_template
  FROM public.core_setup_profiles
  WHERE tenant_id = _tenant_id;

  effective_template := COALESCE(effective_template, _template_slug, 'blank_operating_system');

  WITH RECURSIVE selected AS (
    SELECT tc.capability_key, tc.install_order, tc.config, 'template'::text AS source
    FROM public.core_template_capabilities tc
    WHERE tc.template_slug = effective_template AND tc.enabled
    UNION
    SELECT d.dependency_key AS capability_key, COALESCE(s.install_order, 100) - 1 AS install_order, '{}'::jsonb AS config, 'dependency'::text AS source
    FROM selected s
    JOIN public.core_capability_dependencies d ON d.capability_key = s.capability_key AND d.dependency_type = 'CAPABILITY' AND d.required
  ), normalized AS (
    SELECT DISTINCT ON (s.capability_key)
      s.capability_key,
      MIN(s.install_order) OVER (PARTITION BY s.capability_key) AS install_order,
      s.config,
      s.source
    FROM selected s
    JOIN public.core_capability_registry cr ON cr.capability_key = s.capability_key AND cr.enabled AND cr.installable
    ORDER BY s.capability_key, s.source DESC
  ), upserted AS (
    INSERT INTO public.core_organization_capabilities(
      tenant_id, capability_key, status, installed_version, source_template_slug, source, config
    )
    SELECT
      _tenant_id,
      n.capability_key,
      'enabled',
      cr.version,
      effective_template,
      n.source,
      n.config
    FROM normalized n
    JOIN public.core_capability_registry cr ON cr.capability_key = n.capability_key
    ON CONFLICT (tenant_id, capability_key) DO UPDATE SET
      status='enabled',
      installed_version=EXCLUDED.installed_version,
      source_template_slug=EXCLUDED.source_template_slug,
      source=EXCLUDED.source,
      config=EXCLUDED.config,
      updated_at=now()
    RETURNING (xmax = 0) AS inserted
  )
  SELECT
    COUNT(*) FILTER (WHERE inserted),
    COUNT(*) FILTER (WHERE NOT inserted)
  INTO inserted_count, updated_count
  FROM upserted;

  RETURN jsonb_build_object(
    'tenant_id', _tenant_id,
    'template_slug', effective_template,
    'inserted', COALESCE(inserted_count,0),
    'updated', COALESCE(updated_count,0),
    'installed_capabilities', (SELECT count(*) FROM public.core_organization_capabilities WHERE tenant_id=_tenant_id AND status='enabled')
  );
END;
$$;

COMMENT ON FUNCTION public.apply_capabilities_for_tenant(uuid, text) IS 'Installs ORGANIZATION-owned capabilities from TEMPLATE composition and CAPABILITY dependencies.';
GRANT EXECUTE ON FUNCTION public.apply_capabilities_for_tenant(uuid, text) TO authenticated;

-- ============================================================================
-- 11) Update asset application functions to respect installed capabilities
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_permission_assets_for_tenant(
  _tenant_id uuid,
  _template_slug text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  effective_template text;
  inserted_count int := 0;
  updated_count int := 0;
BEGIN
  IF _tenant_id IS NULL THEN RAISE EXCEPTION 'tenant_id is required'; END IF;
  IF auth.uid() IS NOT NULL AND NOT public.can_access_tenant(_tenant_id) THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT COALESCE(_template_slug, template_slug, raw_setup->>'template_slug', 'blank_operating_system')
  INTO effective_template
  FROM public.core_setup_profiles
  WHERE tenant_id = _tenant_id;
  effective_template := COALESCE(effective_template, _template_slug, 'blank_operating_system');

  PERFORM public.apply_capabilities_for_tenant(_tenant_id, effective_template);

  WITH source_permissions AS (
    SELECT p.*
    FROM public.core_permission_assets p
    JOIN public.core_organization_capabilities oc
      ON oc.tenant_id = _tenant_id
     AND oc.capability_key = p.capability_registry_key
     AND oc.status = 'enabled'
    WHERE p.is_active
      AND (
        p.ownership_level IN ('CORE','CAPABILITY')
        OR (p.ownership_level = 'TEMPLATE' AND p.owner_key = effective_template)
      )
  ), expanded AS (
    SELECT sp.*, role_key
    FROM source_permissions sp
    CROSS JOIN LATERAL unnest(sp.default_roles) AS role_key
  ), upserted AS (
    INSERT INTO public.core_permission_bindings(tenant_id, role_key, permission_key, permission_asset_id, source_ownership_level, source_owner_key, effect, conditions, metadata, is_active)
    SELECT _tenant_id, e.role_key, e.permission_key, e.id, e.ownership_level, e.owner_key, 'allow', e.conditions, e.metadata || jsonb_build_object('generated_from_permission_asset', true), true
    FROM expanded e
    ON CONFLICT (tenant_id, role_key, permission_key) DO UPDATE SET
      permission_asset_id=EXCLUDED.permission_asset_id,
      source_ownership_level=EXCLUDED.source_ownership_level,
      source_owner_key=EXCLUDED.source_owner_key,
      effect=EXCLUDED.effect,
      conditions=EXCLUDED.conditions,
      metadata=EXCLUDED.metadata,
      is_active=true
    RETURNING (xmax = 0) AS inserted
  )
  SELECT COUNT(*) FILTER (WHERE inserted), COUNT(*) FILTER (WHERE NOT inserted)
  INTO inserted_count, updated_count
  FROM upserted;

  RETURN jsonb_build_object('tenant_id', _tenant_id, 'template_slug', effective_template, 'inserted', COALESCE(inserted_count,0), 'updated', COALESCE(updated_count,0), 'total_permission_bindings', (SELECT count(*) FROM public.core_permission_bindings WHERE tenant_id=_tenant_id AND is_active));
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_permission_assets_for_tenant(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_navigation_assets_for_tenant(
  _tenant_id uuid,
  _template_slug text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  effective_template text;
  inserted_count int := 0;
  updated_count int := 0;
BEGIN
  IF _tenant_id IS NULL THEN RAISE EXCEPTION 'tenant_id is required'; END IF;
  IF auth.uid() IS NOT NULL AND NOT public.can_access_tenant(_tenant_id) THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT COALESCE(_template_slug, template_slug, raw_setup->>'template_slug', 'blank_operating_system')
  INTO effective_template
  FROM public.core_setup_profiles
  WHERE tenant_id = _tenant_id;
  effective_template := COALESCE(effective_template, _template_slug, 'blank_operating_system');

  PERFORM public.apply_capabilities_for_tenant(_tenant_id, effective_template);

  WITH source_assets AS (
    SELECT a.*
    FROM public.core_navigation_assets a
    JOIN public.core_organization_capabilities oc
      ON oc.tenant_id = _tenant_id
     AND oc.capability_key = a.capability_key
     AND oc.status = 'enabled'
    WHERE a.is_active
      AND (
        a.ownership_level IN ('CORE','CAPABILITY')
        OR (a.ownership_level = 'TEMPLATE' AND a.owner_key = effective_template)
      )
  ), upserted AS (
    INSERT INTO public.core_navigation_items(tenant_id, department_key, item_key, label_ar, label_en, route, icon, required_roles, required_permissions, visibility_rules, sort_order, is_active, config, source_asset_id, source_ownership_level, source_owner_key, ownership_level)
    SELECT _tenant_id, s.group_key, s.asset_key, s.label_ar, s.label_en, s.route, s.icon, s.required_roles, s.required_permissions, s.visibility_rules, s.sort_order, true, s.metadata || jsonb_build_object('generated_from_navigation_asset', true, 'source_asset_key', s.asset_key, 'capability_key', s.capability_key), s.id, s.ownership_level, s.owner_key, 'ORGANIZATION'
    FROM source_assets s
    ON CONFLICT (tenant_id, item_key) DO UPDATE SET
      department_key=EXCLUDED.department_key,
      label_ar=EXCLUDED.label_ar,
      label_en=EXCLUDED.label_en,
      route=EXCLUDED.route,
      icon=EXCLUDED.icon,
      required_roles=EXCLUDED.required_roles,
      required_permissions=EXCLUDED.required_permissions,
      visibility_rules=EXCLUDED.visibility_rules,
      sort_order=EXCLUDED.sort_order,
      is_active=true,
      config=EXCLUDED.config,
      source_asset_id=EXCLUDED.source_asset_id,
      source_ownership_level=EXCLUDED.source_ownership_level,
      source_owner_key=EXCLUDED.source_owner_key
    RETURNING (xmax = 0) AS inserted
  )
  SELECT COUNT(*) FILTER (WHERE inserted), COUNT(*) FILTER (WHERE NOT inserted)
  INTO inserted_count, updated_count
  FROM upserted;

  RETURN jsonb_build_object('tenant_id', _tenant_id, 'template_slug', effective_template, 'inserted', COALESCE(inserted_count,0), 'updated', COALESCE(updated_count,0), 'total_navigation_items', (SELECT count(*) FROM public.core_navigation_items WHERE tenant_id=_tenant_id AND is_active));
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_navigation_assets_for_tenant(uuid, text) TO authenticated;
