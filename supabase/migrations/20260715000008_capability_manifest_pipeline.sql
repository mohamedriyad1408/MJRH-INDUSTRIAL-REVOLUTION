-- Sprint 1D — Capability Manifest & Installation Pipeline
-- Additive migration. Existing organizations and historical business records are preserved.

-- ============================================================================
-- 1) Capability manifest metadata on registry
-- ============================================================================

ALTER TABLE public.core_capability_registry
  ADD COLUMN IF NOT EXISTS manifest_schema_version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS manifest_json jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.core_capability_registry.manifest_json IS 'Canonical installable capability manifest snapshot derived from registry, dependencies and source assets.';

-- ============================================================================
-- 2) Build and refresh capability manifests
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
  ), nav AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'asset_key', asset_key,
      'ownership_level', ownership_level,
      'owner_key', owner_key,
      'group_key', group_key,
      'label_ar', label_ar,
      'label_en', label_en,
      'route', route,
      'icon', icon,
      'required_roles', required_roles,
      'required_permissions', required_permissions,
      'visibility_rules', visibility_rules,
      'sort_order', sort_order,
      'metadata', metadata
    ) ORDER BY sort_order, asset_key), '[]'::jsonb) AS value
    FROM public.core_navigation_assets
    WHERE capability_key = _capability_key
      AND is_active
  ), perms AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'permission_key', permission_key,
      'ownership_level', ownership_level,
      'owner_key', owner_key,
      'capability_key', capability_key,
      'resource_key', resource_key,
      'action_key', action_key,
      'description', description,
      'default_roles', default_roles,
      'conditions', conditions,
      'metadata', metadata
    ) ORDER BY permission_key), '[]'::jsonb) AS value
    FROM public.core_permission_assets
    WHERE capability_registry_key = _capability_key
      AND is_active
  )
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM cap) THEN '{}'::jsonb
    ELSE jsonb_build_object(
      'schema_version', 1,
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
      'assets', jsonb_build_object(
        'navigation', nav.value,
        'permissions', perms.value,
        'workflow', '[]'::jsonb,
        'forms', '[]'::jsonb,
        'reports', '[]'::jsonb,
        'automation', '[]'::jsonb
      ),
      'hooks', jsonb_build_object(
        'install', '[]'::jsonb,
        'uninstall', '[]'::jsonb
      ),
      'metadata', cap.metadata
    )
  END
  FROM cap, deps, nav, perms;
$$;

GRANT EXECUTE ON FUNCTION public.build_capability_manifest(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_capability_manifest(_capability_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  manifest jsonb;
BEGIN
  manifest := public.build_capability_manifest(_capability_key);
  IF manifest = '{}'::jsonb THEN
    RAISE EXCEPTION 'Capability not found or disabled: %', _capability_key;
  END IF;

  UPDATE public.core_capability_registry
  SET manifest_json = manifest,
      manifest_schema_version = COALESCE((manifest->>'schema_version')::int, 1),
      updated_at = now()
  WHERE capability_key = _capability_key;

  RETURN manifest;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_capability_manifest(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_all_capability_manifests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  refreshed int := 0;
BEGIN
  FOR r IN SELECT capability_key FROM public.core_capability_registry WHERE enabled ORDER BY capability_key LOOP
    PERFORM public.refresh_capability_manifest(r.capability_key);
    refreshed := refreshed + 1;
  END LOOP;
  RETURN jsonb_build_object('refreshed', refreshed);
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_all_capability_manifests() TO authenticated;

-- ============================================================================
-- 3) Manifest dependency validation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_capability_manifest(_capability_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH manifest AS (
    SELECT public.build_capability_manifest(_capability_key) AS m
  ), deps AS (
    SELECT dep
    FROM manifest, jsonb_array_elements(COALESCE(m->'dependencies','[]'::jsonb)) dep
  ), missing AS (
    SELECT dep
    FROM deps
    LEFT JOIN public.core_capability_registry cr
      ON cr.capability_key = dep->>'dependency_key'
     AND cr.enabled
    WHERE dep->>'dependency_type' = 'CAPABILITY'
      AND cr.capability_key IS NULL
  )
  SELECT jsonb_build_object(
    'capability_key', _capability_key,
    'manifest_exists', (SELECT m <> '{}'::jsonb FROM manifest),
    'dependency_count', (SELECT count(*) FROM deps),
    'missing_dependencies', COALESCE((SELECT jsonb_agg(dep) FROM missing), '[]'::jsonb),
    'valid', (SELECT m <> '{}'::jsonb FROM manifest) AND NOT EXISTS (SELECT 1 FROM missing)
  );
$$;

GRANT EXECUTE ON FUNCTION public.validate_capability_manifest(text) TO authenticated;

-- ============================================================================
-- 4) Installation pipeline uses manifests
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

  PERFORM public.refresh_all_capability_manifests();

  WITH RECURSIVE selected AS (
    SELECT tc.capability_key, tc.install_order, tc.config, 'template'::text AS source
    FROM public.core_template_capabilities tc
    WHERE tc.template_slug = effective_template AND tc.enabled
    UNION
    SELECT d.dependency_key AS capability_key, COALESCE(s.install_order, 100) - 1 AS install_order, '{}'::jsonb AS config, 'dependency'::text AS source
    FROM selected s
    JOIN public.core_capability_dependencies d
      ON d.capability_key = s.capability_key
     AND d.dependency_type = 'CAPABILITY'
     AND d.required
  ), normalized AS (
    SELECT DISTINCT ON (s.capability_key)
      s.capability_key,
      MIN(s.install_order) OVER (PARTITION BY s.capability_key) AS install_order,
      s.config,
      s.source
    FROM selected s
    JOIN public.core_capability_registry cr
      ON cr.capability_key = s.capability_key
     AND cr.enabled
     AND cr.installable
     AND cr.manifest_json <> '{}'::jsonb
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
      n.config || jsonb_build_object(
        'manifest_schema_version', cr.manifest_schema_version,
        'manifest_identity', cr.manifest_json->'identity',
        'manifest_dependencies', cr.manifest_json->'dependencies'
      )
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

COMMENT ON FUNCTION public.apply_capabilities_for_tenant(uuid, text) IS 'Installs capabilities into an organization from refreshed capability manifests and template composition.';
GRANT EXECUTE ON FUNCTION public.apply_capabilities_for_tenant(uuid, text) TO authenticated;

-- ============================================================================
-- 5) Initial manifest refresh
-- ============================================================================

SELECT public.refresh_all_capability_manifests();
