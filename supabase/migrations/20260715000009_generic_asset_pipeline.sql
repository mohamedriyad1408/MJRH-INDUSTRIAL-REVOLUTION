-- Sprint 1E — Generic Asset Pipeline Foundation
-- Additive migration. No historical business records are modified.

-- ============================================================================
-- 1) Generic asset type registry
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_asset_type_registry (
  asset_type text PRIMARY KEY,
  name_en text NOT NULL,
  description text,
  installer_function text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','reserved','deprecated')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.core_asset_type_registry IS 'Registry of platform asset categories and optional installer functions. Enables data-driven asset pipeline expansion.';
COMMENT ON COLUMN public.core_asset_type_registry.installer_function IS 'Optional public function name with signature (uuid,text) used by the generic asset pipeline.';

ALTER TABLE public.core_asset_type_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_asset_type_registry_read ON public.core_asset_type_registry;
CREATE POLICY core_asset_type_registry_read ON public.core_asset_type_registry
FOR SELECT TO authenticated
USING (true);

DROP TRIGGER IF EXISTS trg_core_asset_type_registry_updated ON public.core_asset_type_registry;
CREATE TRIGGER trg_core_asset_type_registry_updated
BEFORE UPDATE ON public.core_asset_type_registry
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

INSERT INTO public.core_asset_type_registry(asset_type, name_en, description, installer_function, status, metadata)
VALUES
  ('navigation','Navigation','Role-aware runtime navigation assets.','apply_navigation_assets_for_tenant','active','{}'),
  ('permission','Permission','Role-to-permission authorization assets.','apply_permission_assets_for_tenant','active','{}'),
  ('workflow','Workflow','Future workflow blueprint/stage assets.',NULL,'reserved','{}'),
  ('form','Form','Future generated form/checklist assets.',NULL,'reserved','{}'),
  ('report','Report','Future generated report definition assets.',NULL,'reserved','{}'),
  ('document','Document','Future generated document template assets.',NULL,'reserved','{}'),
  ('dashboard','Dashboard','Future dashboard/widget assets.',NULL,'reserved','{}'),
  ('automation','Automation','Future event trigger/action assets.',NULL,'reserved','{}')
ON CONFLICT (asset_type) DO UPDATE SET
  name_en=EXCLUDED.name_en,
  description=EXCLUDED.description,
  installer_function=EXCLUDED.installer_function,
  status=EXCLUDED.status,
  metadata=EXCLUDED.metadata;

-- ============================================================================
-- 2) Generic capability asset definitions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_capability_asset_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ownership_level text NOT NULL CHECK (ownership_level IN ('CORE','CAPABILITY','TEMPLATE')),
  capability_key text NOT NULL REFERENCES public.core_capability_registry(capability_key),
  asset_type text NOT NULL REFERENCES public.core_asset_type_registry(asset_type),
  asset_key text NOT NULL,
  source_table text,
  source_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  version text NOT NULL DEFAULT '1.0.0',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','reserved','deprecated')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ownership_level, capability_key, asset_type, asset_key)
);

COMMENT ON TABLE public.core_capability_asset_definitions IS 'Generic source asset definitions owned by capabilities/templates/core. Navigation and permission assets are mirrored here for the generic pipeline.';

CREATE INDEX IF NOT EXISTS idx_core_capability_assets_capability ON public.core_capability_asset_definitions(capability_key, asset_type) WHERE status='active';
CREATE INDEX IF NOT EXISTS idx_core_capability_assets_type ON public.core_capability_asset_definitions(asset_type) WHERE status='active';

ALTER TABLE public.core_capability_asset_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_capability_asset_definitions_read ON public.core_capability_asset_definitions;
CREATE POLICY core_capability_asset_definitions_read ON public.core_capability_asset_definitions
FOR SELECT TO authenticated
USING (status IN ('active','reserved'));

DROP TRIGGER IF EXISTS trg_core_capability_asset_definitions_updated ON public.core_capability_asset_definitions;
CREATE TRIGGER trg_core_capability_asset_definitions_updated
BEFORE UPDATE ON public.core_capability_asset_definitions
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

-- ============================================================================
-- 3) Organization generic asset installation state
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_organization_asset_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  capability_key text NOT NULL REFERENCES public.core_capability_registry(capability_key),
  asset_type text NOT NULL REFERENCES public.core_asset_type_registry(asset_type),
  asset_key text NOT NULL,
  asset_definition_id uuid REFERENCES public.core_capability_asset_definitions(id),
  ownership_level text NOT NULL DEFAULT 'ORGANIZATION' CHECK (ownership_level = 'ORGANIZATION'),
  status text NOT NULL DEFAULT 'installed' CHECK (status IN ('installed','enabled','disabled','failed','removed')),
  source_template_slug text,
  installed_version text NOT NULL DEFAULT '1.0.0',
  install_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  installed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, capability_key, asset_type, asset_key)
);

COMMENT ON TABLE public.core_organization_asset_installs IS 'ORGANIZATION-owned runtime asset installation state for all generic asset types.';

CREATE INDEX IF NOT EXISTS idx_core_org_asset_installs_tenant ON public.core_organization_asset_installs(tenant_id, asset_type, status);

ALTER TABLE public.core_organization_asset_installs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_organization_asset_installs_tenant_all ON public.core_organization_asset_installs;
CREATE POLICY core_organization_asset_installs_tenant_all ON public.core_organization_asset_installs
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

DROP TRIGGER IF EXISTS trg_core_organization_asset_installs_updated ON public.core_organization_asset_installs;
CREATE TRIGGER trg_core_organization_asset_installs_updated
BEFORE UPDATE ON public.core_organization_asset_installs
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

-- ============================================================================
-- 4) Sync existing navigation and permission assets into generic definitions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_generic_capability_asset_definitions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nav_count int := 0;
  perm_count int := 0;
BEGIN
  INSERT INTO public.core_capability_asset_definitions(
    ownership_level, capability_key, asset_type, asset_key, source_table, source_id, payload, version, status, metadata
  )
  SELECT
    a.ownership_level,
    a.capability_key,
    'navigation',
    a.asset_key,
    'core_navigation_assets',
    a.id,
    jsonb_build_object(
      'group_key', a.group_key,
      'parent_asset_key', a.parent_asset_key,
      'label_ar', a.label_ar,
      'label_en', a.label_en,
      'route', a.route,
      'icon', a.icon,
      'required_roles', a.required_roles,
      'required_permissions', a.required_permissions,
      'visibility_rules', a.visibility_rules,
      'sort_order', a.sort_order
    ),
    '1.0.0',
    CASE WHEN a.is_active THEN 'active' ELSE 'deprecated' END,
    a.metadata
  FROM public.core_navigation_assets a
  WHERE a.capability_key IS NOT NULL
  ON CONFLICT (ownership_level, capability_key, asset_type, asset_key) DO UPDATE SET
    source_table=EXCLUDED.source_table,
    source_id=EXCLUDED.source_id,
    payload=EXCLUDED.payload,
    status=EXCLUDED.status,
    metadata=EXCLUDED.metadata,
    updated_at=now();
  GET DIAGNOSTICS nav_count = ROW_COUNT;

  INSERT INTO public.core_capability_asset_definitions(
    ownership_level, capability_key, asset_type, asset_key, source_table, source_id, payload, version, status, metadata
  )
  SELECT
    p.ownership_level,
    p.capability_registry_key,
    'permission',
    p.permission_key,
    'core_permission_assets',
    p.id,
    jsonb_build_object(
      'permission_key', p.permission_key,
      'capability_key', p.capability_key,
      'resource_key', p.resource_key,
      'action_key', p.action_key,
      'description', p.description,
      'default_roles', p.default_roles,
      'conditions', p.conditions
    ),
    '1.0.0',
    CASE WHEN p.is_active THEN 'active' ELSE 'deprecated' END,
    p.metadata
  FROM public.core_permission_assets p
  WHERE p.capability_registry_key IS NOT NULL
  ON CONFLICT (ownership_level, capability_key, asset_type, asset_key) DO UPDATE SET
    source_table=EXCLUDED.source_table,
    source_id=EXCLUDED.source_id,
    payload=EXCLUDED.payload,
    status=EXCLUDED.status,
    metadata=EXCLUDED.metadata,
    updated_at=now();
  GET DIAGNOSTICS perm_count = ROW_COUNT;

  RETURN jsonb_build_object('navigation_assets_synced', nav_count, 'permission_assets_synced', perm_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_generic_capability_asset_definitions() TO authenticated;

-- ============================================================================
-- 5) Update manifest builder to reference generic assets
-- ============================================================================

CREATE OR REPLACE FUNCTION public.build_capability_manifest(_capability_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cap AS (
    SELECT *
    FROM public.core_capability_registry
    WHERE capability_key = _capability_key
      AND enabled
    LIMIT 1
  ), deps AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'dependency_type', dependency_type,
      'dependency_key', dependency_key,
      'required', required,
      'metadata', metadata
    ) ORDER BY dependency_type, dependency_key), '[]'::jsonb) AS value
    FROM public.core_capability_dependencies
    WHERE capability_key = _capability_key
  ), generic_assets AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'asset_type', asset_type,
      'asset_key', asset_key,
      'ownership_level', ownership_level,
      'source_table', source_table,
      'source_id', source_id,
      'version', version,
      'status', status,
      'payload', payload,
      'metadata', metadata
    ) ORDER BY asset_type, asset_key), '[]'::jsonb) AS value
    FROM public.core_capability_asset_definitions
    WHERE capability_key = _capability_key
      AND status IN ('active','reserved')
  ), asset_groups AS (
    SELECT jsonb_build_object(
      'navigation', COALESCE(jsonb_agg(payload || jsonb_build_object('asset_key', asset_key, 'source_id', source_id) ORDER BY asset_key) FILTER (WHERE asset_type='navigation'), '[]'::jsonb),
      'permissions', COALESCE(jsonb_agg(payload || jsonb_build_object('asset_key', asset_key, 'source_id', source_id) ORDER BY asset_key) FILTER (WHERE asset_type='permission'), '[]'::jsonb),
      'workflow', COALESCE(jsonb_agg(payload || jsonb_build_object('asset_key', asset_key, 'source_id', source_id) ORDER BY asset_key) FILTER (WHERE asset_type='workflow'), '[]'::jsonb),
      'forms', COALESCE(jsonb_agg(payload || jsonb_build_object('asset_key', asset_key, 'source_id', source_id) ORDER BY asset_key) FILTER (WHERE asset_type='form'), '[]'::jsonb),
      'reports', COALESCE(jsonb_agg(payload || jsonb_build_object('asset_key', asset_key, 'source_id', source_id) ORDER BY asset_key) FILTER (WHERE asset_type='report'), '[]'::jsonb),
      'documents', COALESCE(jsonb_agg(payload || jsonb_build_object('asset_key', asset_key, 'source_id', source_id) ORDER BY asset_key) FILTER (WHERE asset_type='document'), '[]'::jsonb),
      'dashboards', COALESCE(jsonb_agg(payload || jsonb_build_object('asset_key', asset_key, 'source_id', source_id) ORDER BY asset_key) FILTER (WHERE asset_type='dashboard'), '[]'::jsonb),
      'automation', COALESCE(jsonb_agg(payload || jsonb_build_object('asset_key', asset_key, 'source_id', source_id) ORDER BY asset_key) FILTER (WHERE asset_type='automation'), '[]'::jsonb)
    ) AS value
    FROM public.core_capability_asset_definitions
    WHERE capability_key = _capability_key
      AND status IN ('active','reserved')
  )
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM cap) THEN '{}'::jsonb
    ELSE jsonb_build_object(
      'schema_version', 2,
      'identity', jsonb_build_object(
        'key', cap.capability_key,
        'name_ar', cap.name_ar,
        'name_en', cap.name_en,
        'description', cap.description,
        'category', cap.category,
        'owner', cap.owner,
        'ownership_level', cap.ownership_level,
        'status', cap.status,
        'installable', cap.installable,
        'enabled', cap.enabled,
        'icon', cap.icon,
        'display_order', cap.display_order
      ),
      'version', cap.version,
      'dependencies', deps.value,
      'assets_generic', generic_assets.value,
      'assets', asset_groups.value,
      'hooks', jsonb_build_object(
        'install', '[]'::jsonb,
        'uninstall', '[]'::jsonb
      ),
      'metadata', cap.metadata
    )
  END
  FROM cap, deps, generic_assets, asset_groups;
$$;

GRANT EXECUTE ON FUNCTION public.build_capability_manifest(text) TO authenticated;

-- ============================================================================
-- 6) Generic asset installation pipeline
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_capability_assets_for_tenant(
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
  r record;
  installer_result jsonb;
  installed_count int := 0;
  installer_results jsonb := '[]'::jsonb;
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

  PERFORM public.refresh_generic_capability_asset_definitions();
  PERFORM public.apply_capabilities_for_tenant(_tenant_id, effective_template);

  INSERT INTO public.core_organization_asset_installs(
    tenant_id, capability_key, asset_type, asset_key, asset_definition_id,
    status, source_template_slug, installed_version, install_result
  )
  SELECT
    _tenant_id,
    d.capability_key,
    d.asset_type,
    d.asset_key,
    d.id,
    CASE WHEN atr.installer_function IS NULL THEN 'installed' ELSE 'enabled' END,
    effective_template,
    d.version,
    jsonb_build_object(
      'installer_function', atr.installer_function,
      'source_table', d.source_table,
      'source_id', d.source_id,
      'pipeline', 'generic_asset_pipeline'
    )
  FROM public.core_capability_asset_definitions d
  JOIN public.core_organization_capabilities oc
    ON oc.tenant_id = _tenant_id
   AND oc.capability_key = d.capability_key
   AND oc.status = 'enabled'
  JOIN public.core_asset_type_registry atr ON atr.asset_type = d.asset_type
  WHERE d.status IN ('active','reserved')
  ON CONFLICT (tenant_id, capability_key, asset_type, asset_key) DO UPDATE SET
    asset_definition_id=EXCLUDED.asset_definition_id,
    status=EXCLUDED.status,
    source_template_slug=EXCLUDED.source_template_slug,
    installed_version=EXCLUDED.installed_version,
    install_result=EXCLUDED.install_result,
    updated_at=now();

  GET DIAGNOSTICS installed_count = ROW_COUNT;

  FOR r IN
    SELECT DISTINCT atr.asset_type, atr.installer_function
    FROM public.core_organization_asset_installs oi
    JOIN public.core_asset_type_registry atr ON atr.asset_type = oi.asset_type
    WHERE oi.tenant_id = _tenant_id
      AND oi.status IN ('installed','enabled')
      AND atr.installer_function IS NOT NULL
    ORDER BY atr.asset_type
  LOOP
    EXECUTE format('SELECT public.%I($1,$2)', r.installer_function)
    USING _tenant_id, effective_template
    INTO installer_result;

    installer_results := installer_results || jsonb_build_array(jsonb_build_object(
      'asset_type', r.asset_type,
      'installer_function', r.installer_function,
      'result', installer_result
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'tenant_id', _tenant_id,
    'template_slug', effective_template,
    'asset_install_records_touched', installed_count,
    'installer_results', installer_results,
    'installed_asset_records', (SELECT count(*) FROM public.core_organization_asset_installs WHERE tenant_id=_tenant_id AND status IN ('installed','enabled'))
  );
END;
$$;

COMMENT ON FUNCTION public.apply_capability_assets_for_tenant(uuid, text) IS 'Generic asset-type pipeline. Installs organization asset records and invokes data-driven installer functions for active asset types.';
GRANT EXECUTE ON FUNCTION public.apply_capability_assets_for_tenant(uuid, text) TO authenticated;

-- ============================================================================
-- 7) Refresh generic definitions and manifests now
-- ============================================================================

SELECT public.refresh_generic_capability_asset_definitions();
SELECT public.refresh_all_capability_manifests();
