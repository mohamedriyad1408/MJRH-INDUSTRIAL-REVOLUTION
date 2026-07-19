-- Sprint 1B — Permission Binding Engine
-- Additive migration only. Existing user_roles and historical Dry Tech business data are preserved.

-- ============================================================================
-- 1) CORE/CAPABILITY/TEMPLATE permission assets
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_permission_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ownership_level text NOT NULL CHECK (ownership_level IN ('CORE','CAPABILITY','TEMPLATE')),
  owner_key text NOT NULL,
  permission_key text NOT NULL,
  capability_key text NOT NULL,
  resource_key text NOT NULL,
  action_key text NOT NULL,
  description text,
  default_roles text[] NOT NULL DEFAULT ARRAY[]::text[],
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ownership_level, owner_key, permission_key),
  CHECK (permission_key = capability_key || '.' || resource_key || '.' || action_key)
);

COMMENT ON TABLE public.core_permission_assets IS 'CORE/CAPABILITY/TEMPLATE owned permission definitions. Source assets only; tenant runtime bindings live in core_permission_bindings.';
COMMENT ON COLUMN public.core_permission_assets.permission_key IS 'Canonical permission key: capability.resource.action';

CREATE INDEX IF NOT EXISTS idx_core_permission_assets_owner ON public.core_permission_assets(ownership_level, owner_key) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_core_permission_assets_key ON public.core_permission_assets(permission_key) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_core_permission_assets_capability ON public.core_permission_assets(capability_key, resource_key, action_key) WHERE is_active;

ALTER TABLE public.core_permission_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_permission_assets_read ON public.core_permission_assets;
CREATE POLICY core_permission_assets_read ON public.core_permission_assets
FOR SELECT TO authenticated
USING (is_active = true);

DROP TRIGGER IF EXISTS trg_core_permission_assets_updated ON public.core_permission_assets;
CREATE TRIGGER trg_core_permission_assets_updated
BEFORE UPDATE ON public.core_permission_assets
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

-- ============================================================================
-- 2) ORGANIZATION-owned runtime permission bindings
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_permission_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ownership_level text NOT NULL DEFAULT 'ORGANIZATION' CHECK (ownership_level = 'ORGANIZATION'),
  role_key text NOT NULL,
  permission_key text NOT NULL,
  permission_asset_id uuid REFERENCES public.core_permission_assets(id),
  source_ownership_level text CHECK (source_ownership_level IN ('CORE','CAPABILITY','TEMPLATE')),
  source_owner_key text,
  effect text NOT NULL DEFAULT 'allow' CHECK (effect IN ('allow','deny')),
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, role_key, permission_key)
);

COMMENT ON TABLE public.core_permission_bindings IS 'ORGANIZATION-owned runtime role-to-permission bindings generated from permission assets or custom organization configuration.';
COMMENT ON COLUMN public.core_permission_bindings.role_key IS 'Runtime role key. May map to app roles, template roles, or custom organization roles.';

CREATE INDEX IF NOT EXISTS idx_core_permission_bindings_tenant_role ON public.core_permission_bindings(tenant_id, role_key) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_core_permission_bindings_permission ON public.core_permission_bindings(tenant_id, permission_key) WHERE is_active;

ALTER TABLE public.core_permission_bindings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_permission_bindings_tenant_all ON public.core_permission_bindings;
CREATE POLICY core_permission_bindings_tenant_all ON public.core_permission_bindings
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

DROP TRIGGER IF EXISTS trg_core_permission_bindings_updated ON public.core_permission_bindings;
CREATE TRIGGER trg_core_permission_bindings_updated
BEFORE UPDATE ON public.core_permission_bindings
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

-- ============================================================================
-- 3) Navigation assets can declare permission requirements
-- ============================================================================

-- Column already exists from Sprint 1A on core_navigation_assets; ensure it remains explicit.
ALTER TABLE public.core_navigation_assets
  ADD COLUMN IF NOT EXISTS required_permissions text[] NOT NULL DEFAULT ARRAY[]::text[];

-- ============================================================================
-- 4) Seed generic permission assets
-- ============================================================================

-- CORE permissions
INSERT INTO public.core_permission_assets (ownership_level, owner_key, permission_key, capability_key, resource_key, action_key, description, default_roles, metadata)
VALUES
  ('CORE','core','core.organization.view','core','organization','view','View organization shell and basic business context.',ARRAY['owner','ops_manager','cs_manager'],'{}'),
  ('CORE','core','core.configuration.view','core','configuration','view','View organization configuration.',ARRAY['owner','ops_manager'],'{}'),
  ('CORE','core','core.configuration.configure','core','configuration','configure','Configure organization-level settings.',ARRAY['owner'],'{}'),
  ('CORE','core','core.navigation.view','core','navigation','view','View generated navigation.',ARRAY['owner','ops_manager','cs_manager','employee','courier'],'{}'),
  ('CORE','core','core.search.use','core','search','use','Use unified search.',ARRAY['owner','ops_manager','cs_manager','employee','courier'],'{}')
ON CONFLICT (ownership_level, owner_key, permission_key) DO UPDATE SET
  description=EXCLUDED.description, default_roles=EXCLUDED.default_roles, metadata=EXCLUDED.metadata, is_active=true;

-- Orders capability
INSERT INTO public.core_permission_assets (ownership_level, owner_key, permission_key, capability_key, resource_key, action_key, description, default_roles, metadata)
VALUES
  ('CAPABILITY','orders','orders.order.view','orders','order','view','View orders.',ARRAY['owner','ops_manager','cs_manager','employee'],'{}'),
  ('CAPABILITY','orders','orders.order.create','orders','order','create','Create orders.',ARRAY['owner','cs_manager'],'{}'),
  ('CAPABILITY','orders','orders.order.update','orders','order','update','Update orders.',ARRAY['owner','ops_manager','cs_manager'],'{}'),
  ('CAPABILITY','orders','orders.order.cancel','orders','order','cancel','Cancel orders.',ARRAY['owner','ops_manager'],'{}')
ON CONFLICT (ownership_level, owner_key, permission_key) DO UPDATE SET description=EXCLUDED.description, default_roles=EXCLUDED.default_roles, is_active=true;

-- CRM capability
INSERT INTO public.core_permission_assets (ownership_level, owner_key, permission_key, capability_key, resource_key, action_key, description, default_roles, metadata)
VALUES
  ('CAPABILITY','crm','crm.customer.view','crm','customer','view','View customers.',ARRAY['owner','ops_manager','cs_manager','employee'],'{}'),
  ('CAPABILITY','crm','crm.customer.create','crm','customer','create','Create customers.',ARRAY['owner','cs_manager'],'{}'),
  ('CAPABILITY','crm','crm.customer.update','crm','customer','update','Update customers.',ARRAY['owner','cs_manager'],'{}'),
  ('CAPABILITY','crm','crm.customer_care.view','crm','customer_care','view','View customer care workspace.',ARRAY['owner','ops_manager','cs_manager'],'{}')
ON CONFLICT (ownership_level, owner_key, permission_key) DO UPDATE SET description=EXCLUDED.description, default_roles=EXCLUDED.default_roles, is_active=true;

-- Catalog capability
INSERT INTO public.core_permission_assets (ownership_level, owner_key, permission_key, capability_key, resource_key, action_key, description, default_roles, metadata)
VALUES
  ('CAPABILITY','catalog','catalog.service.view','catalog','service','view','View services/catalog.',ARRAY['owner','cs_manager','ops_manager'],'{}'),
  ('CAPABILITY','catalog','catalog.service.configure','catalog','service','configure','Configure service catalog.',ARRAY['owner','cs_manager'],'{}'),
  ('CAPABILITY','catalog','catalog.inventory.view','catalog','inventory','view','View inventory.',ARRAY['owner','ops_manager'],'{}'),
  ('CAPABILITY','catalog','catalog.branch.view','catalog','branch','view','View branches.',ARRAY['owner','ops_manager','cs_manager'],'{}'),
  ('CAPABILITY','catalog','catalog.branch.configure','catalog','branch','configure','Configure branches.',ARRAY['owner'],'{}')
ON CONFLICT (ownership_level, owner_key, permission_key) DO UPDATE SET description=EXCLUDED.description, default_roles=EXCLUDED.default_roles, is_active=true;

-- Workflow capability
INSERT INTO public.core_permission_assets (ownership_level, owner_key, permission_key, capability_key, resource_key, action_key, description, default_roles, metadata)
VALUES
  ('CAPABILITY','workflow','workflow.work_order.view','workflow','work_order','view','View work orders.',ARRAY['owner','ops_manager','cs_manager','employee'],'{}'),
  ('CAPABILITY','workflow','workflow.work_order.create','workflow','work_order','create','Create work orders.',ARRAY['owner','ops_manager','cs_manager'],'{}'),
  ('CAPABILITY','workflow','workflow.task.view','workflow','task','view','View tasks.',ARRAY['owner','ops_manager','cs_manager','employee','courier'],'{}'),
  ('CAPABILITY','workflow','workflow.task.assign','workflow','task','assign','Assign tasks.',ARRAY['owner','ops_manager'],'{}'),
  ('CAPABILITY','workflow','workflow.task.complete','workflow','task','complete','Complete assigned tasks.',ARRAY['owner','ops_manager','employee','courier'],'{}'),
  ('CAPABILITY','workflow','workflow.issue.view','workflow','issue','view','View operational issues.',ARRAY['owner','ops_manager','cs_manager'],'{}'),
  ('CAPABILITY','workflow','workflow.health.view','workflow','health','view','View operational health.',ARRAY['owner','ops_manager'],'{}')
ON CONFLICT (ownership_level, owner_key, permission_key) DO UPDATE SET description=EXCLUDED.description, default_roles=EXCLUDED.default_roles, is_active=true;

-- Field service capability
INSERT INTO public.core_permission_assets (ownership_level, owner_key, permission_key, capability_key, resource_key, action_key, description, default_roles, metadata)
VALUES
  ('CAPABILITY','field_service','field_service.pickup.view','field_service','pickup','view','View pickup requests.',ARRAY['owner','ops_manager','cs_manager'],'{}'),
  ('CAPABILITY','field_service','field_service.pickup.create','field_service','pickup','create','Create pickup requests.',ARRAY['owner','cs_manager'],'{}'),
  ('CAPABILITY','field_service','field_service.delivery.view','field_service','delivery','view','View delivery/driver workspace.',ARRAY['owner','ops_manager','courier'],'{}'),
  ('CAPABILITY','field_service','field_service.map.view','field_service','map','view','View live map/field team.',ARRAY['owner','ops_manager'],'{}')
ON CONFLICT (ownership_level, owner_key, permission_key) DO UPDATE SET description=EXCLUDED.description, default_roles=EXCLUDED.default_roles, is_active=true;

-- Accounting capability
INSERT INTO public.core_permission_assets (ownership_level, owner_key, permission_key, capability_key, resource_key, action_key, description, default_roles, metadata)
VALUES
  ('CAPABILITY','accounting','accounting.finance.view','accounting','finance','view','View finance workspace.',ARRAY['owner','ops_manager','cs_manager'],'{}'),
  ('CAPABILITY','accounting','accounting.accounting.view','accounting','accounting','view','View accounting workspace.',ARRAY['owner','ops_manager'],'{}'),
  ('CAPABILITY','accounting','accounting.journal_entry.view','accounting','journal_entry','view','View journal entries.',ARRAY['owner'],'{}'),
  ('CAPABILITY','accounting','accounting.receivable.view','accounting','receivable','view','View receivables.',ARRAY['owner','ops_manager','cs_manager'],'{}'),
  ('CAPABILITY','accounting','accounting.cash_closing.view','accounting','cash_closing','view','View cash closing.',ARRAY['owner','ops_manager'],'{}'),
  ('CAPABILITY','accounting','accounting.cash_closing.close','accounting','cash_closing','close','Close cash account/day.',ARRAY['owner','ops_manager'],'{}'),
  ('CAPABILITY','accounting','accounting.budget.view','accounting','budget','view','View budgets.',ARRAY['owner'],'{}'),
  ('CAPABILITY','accounting','accounting.finance.approve','accounting','finance','approve','Approve financial actions.',ARRAY['owner'],'{}'),
  ('CAPABILITY','accounting','accounting.report.export','accounting','report','export','Export finance/accounting reports.',ARRAY['owner'],'{}')
ON CONFLICT (ownership_level, owner_key, permission_key) DO UPDATE SET description=EXCLUDED.description, default_roles=EXCLUDED.default_roles, is_active=true;

-- Reporting capability
INSERT INTO public.core_permission_assets (ownership_level, owner_key, permission_key, capability_key, resource_key, action_key, description, default_roles, metadata)
VALUES
  ('CAPABILITY','reporting','reports.report.view','reports','report','view','View reports.',ARRAY['owner','ops_manager','cs_manager'],'{}'),
  ('CAPABILITY','reporting','reports.report.export','reports','report','export','Export reports.',ARRAY['owner','ops_manager'],'{}'),
  ('CAPABILITY','reporting','reports.dashboard.view','reports','dashboard','view','View dashboards.',ARRAY['owner','ops_manager','cs_manager'],'{}')
ON CONFLICT (ownership_level, owner_key, permission_key) DO UPDATE SET description=EXCLUDED.description, default_roles=EXCLUDED.default_roles, is_active=true;

-- HR capability
INSERT INTO public.core_permission_assets (ownership_level, owner_key, permission_key, capability_key, resource_key, action_key, description, default_roles, metadata)
VALUES
  ('CAPABILITY','hr','hr.employee.view','hr','employee','view','View staff/employees.',ARRAY['owner','ops_manager','cs_manager'],'{}'),
  ('CAPABILITY','hr','hr.attendance.view','hr','attendance','view','View attendance.',ARRAY['owner','ops_manager','cs_manager'],'{}'),
  ('CAPABILITY','hr','hr.payroll.view','hr','payroll','view','View payroll/salaries.',ARRAY['owner'],'{}'),
  ('CAPABILITY','hr','hr.schedule.view','hr','schedule','view','View staff schedules.',ARRAY['owner','ops_manager','cs_manager'],'{}'),
  ('CAPABILITY','hr','hr.request.view','hr','request','view','View staff requests.',ARRAY['owner','ops_manager','cs_manager'],'{}')
ON CONFLICT (ownership_level, owner_key, permission_key) DO UPDATE SET description=EXCLUDED.description, default_roles=EXCLUDED.default_roles, is_active=true;

-- Laundry TEMPLATE permissions. These are template-specific, not Core.
INSERT INTO public.core_permission_assets (ownership_level, owner_key, permission_key, capability_key, resource_key, action_key, description, default_roles, metadata)
VALUES
  ('TEMPLATE','laundry','laundry.station.view','laundry','station','view','View Laundry Template station/work-area screens.',ARRAY['owner','ops_manager','cs_manager','employee','receptionist','sorter','cleaning_tech','assembly_tech','ironing_tech','packer','qc_tech','cs_rep','intake_rep'],'{"template":"laundry"}'::jsonb),
  ('TEMPLATE','laundry','laundry.station.operate','laundry','station','operate','Operate Laundry Template station work.',ARRAY['owner','ops_manager','employee','receptionist','sorter','cleaning_tech','assembly_tech','ironing_tech','packer','qc_tech','cs_rep','intake_rep'],'{"template":"laundry"}'::jsonb),
  ('TEMPLATE','laundry','laundry.ironing_payroll.view','laundry','ironing_payroll','view','View Laundry Template ironing payroll.',ARRAY['owner'],'{"template":"laundry"}'::jsonb)
ON CONFLICT (ownership_level, owner_key, permission_key) DO UPDATE SET description=EXCLUDED.description, default_roles=EXCLUDED.default_roles, metadata=EXCLUDED.metadata, is_active=true;

-- ============================================================================
-- 5) Bind navigation assets to permissions
-- ============================================================================

-- CORE navigation permissions
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['reports.dashboard.view'] WHERE ownership_level='CORE' AND owner_key='core' AND asset_key='dashboard';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['reports.dashboard.view'] WHERE ownership_level='CORE' AND owner_key='core' AND asset_key='today';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['core.search.use'] WHERE ownership_level='CORE' AND owner_key='core' AND asset_key='search';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['core.configuration.view'] WHERE ownership_level='CORE' AND owner_key='core' AND asset_key='settings';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['core.navigation.view'] WHERE ownership_level='CORE' AND owner_key='core' AND asset_key='help';

-- CAPABILITY navigation permissions
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['orders.order.view'] WHERE ownership_level='CAPABILITY' AND owner_key='orders' AND asset_key='orders_list';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['orders.order.create'] WHERE ownership_level='CAPABILITY' AND owner_key='orders' AND asset_key='orders_new';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['crm.customer.view'] WHERE ownership_level='CAPABILITY' AND owner_key='crm' AND asset_key='customers';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['crm.customer.view'] WHERE ownership_level='CAPABILITY' AND owner_key='crm' AND asset_key='crm';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['crm.customer_care.view'] WHERE ownership_level='CAPABILITY' AND owner_key='crm' AND asset_key='customer_care';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['catalog.service.view'] WHERE ownership_level='CAPABILITY' AND owner_key='catalog' AND asset_key='services';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['catalog.inventory.view'] WHERE ownership_level='CAPABILITY' AND owner_key='catalog' AND asset_key='inventory';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['catalog.branch.view'] WHERE ownership_level='CAPABILITY' AND owner_key='catalog' AND asset_key='branches';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['workflow.work_order.view'] WHERE ownership_level='CAPABILITY' AND owner_key='workflow' AND asset_key='work_orders';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['workflow.work_order.view'] WHERE ownership_level='CAPABILITY' AND owner_key='workflow' AND asset_key='operations';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['workflow.work_order.view'] WHERE ownership_level='CAPABILITY' AND owner_key='workflow' AND asset_key='daily_operations';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['workflow.issue.view'] WHERE ownership_level='CAPABILITY' AND owner_key='workflow' AND asset_key='issues';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['workflow.health.view'] WHERE ownership_level='CAPABILITY' AND owner_key='workflow' AND asset_key='system_health';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['field_service.pickup.view'] WHERE ownership_level='CAPABILITY' AND owner_key='field_service' AND asset_key='pickups';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['field_service.pickup.create'] WHERE ownership_level='CAPABILITY' AND owner_key='field_service' AND asset_key='pickups_new';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['field_service.delivery.view'] WHERE ownership_level='CAPABILITY' AND owner_key='field_service' AND asset_key='driver';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['field_service.map.view'] WHERE ownership_level='CAPABILITY' AND owner_key='field_service' AND asset_key='live_map';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['accounting.finance.view'] WHERE ownership_level='CAPABILITY' AND owner_key='accounting' AND asset_key='finance';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['accounting.accounting.view'] WHERE ownership_level='CAPABILITY' AND owner_key='accounting' AND asset_key='accounting';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['accounting.journal_entry.view'] WHERE ownership_level='CAPABILITY' AND owner_key='accounting' AND asset_key='ledger';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['accounting.receivable.view'] WHERE ownership_level='CAPABILITY' AND owner_key='accounting' AND asset_key='receivables';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['accounting.cash_closing.view'] WHERE ownership_level='CAPABILITY' AND owner_key='accounting' AND asset_key='cash_closing';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['accounting.budget.view'] WHERE ownership_level='CAPABILITY' AND owner_key='accounting' AND asset_key='budgets';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['reports.report.view'] WHERE ownership_level='CAPABILITY' AND owner_key='reporting' AND asset_key='reports';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['reports.report.export'] WHERE ownership_level='CAPABILITY' AND owner_key='reporting' AND asset_key='report_builder';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['reports.dashboard.view'] WHERE ownership_level='CAPABILITY' AND owner_key='reporting' AND asset_key='executive';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['hr.employee.view'] WHERE ownership_level='CAPABILITY' AND owner_key='hr' AND asset_key='staff';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['hr.attendance.view'] WHERE ownership_level='CAPABILITY' AND owner_key='hr' AND asset_key='attendance';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['hr.employee.view'] WHERE ownership_level='CAPABILITY' AND owner_key='hr' AND asset_key='scorecard';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['hr.request.view'] WHERE ownership_level='CAPABILITY' AND owner_key='hr' AND asset_key='staff_requests';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['hr.payroll.view'] WHERE ownership_level='CAPABILITY' AND owner_key='hr' AND asset_key='salaries';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['hr.schedule.view'] WHERE ownership_level='CAPABILITY' AND owner_key='hr' AND asset_key='schedule';

-- TEMPLATE navigation permissions
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['laundry.station.view'] WHERE ownership_level='TEMPLATE' AND owner_key='laundry' AND asset_key LIKE 'station_%';
UPDATE public.core_navigation_assets SET required_permissions=ARRAY['laundry.ironing_payroll.view'] WHERE ownership_level='TEMPLATE' AND owner_key='laundry' AND asset_key='ironing_payroll';

-- ============================================================================
-- 6) Generate runtime permissions from permission assets
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

  WITH source_permissions AS (
    SELECT *
    FROM public.core_permission_assets p
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
    INSERT INTO public.core_permission_bindings(
      tenant_id, role_key, permission_key, permission_asset_id,
      source_ownership_level, source_owner_key, effect, conditions, metadata, is_active
    )
    SELECT
      _tenant_id,
      e.role_key,
      e.permission_key,
      e.id,
      e.ownership_level,
      e.owner_key,
      'allow',
      e.conditions,
      e.metadata || jsonb_build_object('generated_from_permission_asset', true),
      true
    FROM expanded e
    ON CONFLICT (tenant_id, role_key, permission_key) DO UPDATE SET
      permission_asset_id = EXCLUDED.permission_asset_id,
      source_ownership_level = EXCLUDED.source_ownership_level,
      source_owner_key = EXCLUDED.source_owner_key,
      effect = EXCLUDED.effect,
      conditions = EXCLUDED.conditions,
      metadata = EXCLUDED.metadata,
      is_active = true
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
    'total_permission_bindings', (SELECT count(*) FROM public.core_permission_bindings WHERE tenant_id = _tenant_id AND is_active)
  );
END;
$$;

COMMENT ON FUNCTION public.apply_permission_assets_for_tenant(uuid, text) IS 'Generates ORGANIZATION-owned runtime role-to-permission bindings from CORE/CAPABILITY/TEMPLATE permission assets.';
GRANT EXECUTE ON FUNCTION public.apply_permission_assets_for_tenant(uuid, text) TO authenticated;

-- ============================================================================
-- 7) Generic authorization functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.actor_has_permission(
  _tenant_id uuid,
  _actor_user_id uuid,
  _capability_key text,
  _resource_key text,
  _action_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH wanted AS (
    SELECT _capability_key || '.' || _resource_key || '.' || _action_key AS permission_key
  ), actor_roles AS (
    SELECT ur.role::text AS role_key
    FROM public.user_roles ur
    WHERE ur.user_id = _actor_user_id
      AND (ur.tenant_id = _tenant_id OR ur.role = 'super_admin')
  )
  SELECT
    EXISTS (SELECT 1 FROM actor_roles WHERE role_key = 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.core_permission_bindings b
      JOIN actor_roles ar ON ar.role_key = b.role_key
      JOIN wanted w ON w.permission_key = b.permission_key
      WHERE b.tenant_id = _tenant_id
        AND b.is_active
        AND b.effect = 'allow'
    );
$$;

COMMENT ON FUNCTION public.actor_has_permission(uuid, uuid, text, text, text) IS 'Generic authorization check: can actor perform action on resource within capability for organization.';
GRANT EXECUTE ON FUNCTION public.actor_has_permission(uuid, uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.current_actor_has_permission(
  _tenant_id uuid,
  _capability_key text,
  _resource_key text,
  _action_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.actor_has_permission(_tenant_id, auth.uid(), _capability_key, _resource_key, _action_key);
$$;

GRANT EXECUTE ON FUNCTION public.current_actor_has_permission(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_actor_permissions(_tenant_id uuid, _actor_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(permission_key text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH actor_roles AS (
    SELECT ur.role::text AS role_key
    FROM public.user_roles ur
    WHERE ur.user_id = _actor_user_id
      AND (ur.tenant_id = _tenant_id OR ur.role = 'super_admin')
  )
  SELECT DISTINCT b.permission_key
  FROM public.core_permission_bindings b
  JOIN actor_roles ar ON ar.role_key = b.role_key
  WHERE b.tenant_id = _tenant_id
    AND b.is_active
    AND b.effect = 'allow'
  UNION
  SELECT p.permission_key
  FROM public.core_permission_assets p
  WHERE EXISTS (SELECT 1 FROM actor_roles WHERE role_key = 'super_admin')
    AND p.is_active;
$$;

GRANT EXECUTE ON FUNCTION public.get_actor_permissions(uuid, uuid) TO authenticated;

-- ============================================================================
-- 8) Update navigation generation to carry required permissions
-- ============================================================================

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

  WITH source_assets AS (
    SELECT *
    FROM public.core_navigation_assets a
    WHERE a.is_active
      AND (
        a.ownership_level IN ('CORE','CAPABILITY')
        OR (a.ownership_level = 'TEMPLATE' AND a.owner_key = effective_template)
      )
  ), upserted AS (
    INSERT INTO public.core_navigation_items(
      tenant_id, department_key, item_key, label_ar, label_en, route, icon,
      required_roles, required_permissions, visibility_rules, sort_order, is_active,
      config, source_asset_id, source_ownership_level, source_owner_key, ownership_level
    )
    SELECT
      _tenant_id,
      s.group_key,
      s.asset_key,
      s.label_ar,
      s.label_en,
      s.route,
      s.icon,
      s.required_roles,
      s.required_permissions,
      s.visibility_rules,
      s.sort_order,
      true,
      s.metadata || jsonb_build_object('generated_from_navigation_asset', true, 'source_asset_key', s.asset_key),
      s.id,
      s.ownership_level,
      s.owner_key,
      'ORGANIZATION'
    FROM source_assets s
    ON CONFLICT (tenant_id, item_key) DO UPDATE SET
      department_key = EXCLUDED.department_key,
      label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      route = EXCLUDED.route,
      icon = EXCLUDED.icon,
      required_roles = EXCLUDED.required_roles,
      required_permissions = EXCLUDED.required_permissions,
      visibility_rules = EXCLUDED.visibility_rules,
      sort_order = EXCLUDED.sort_order,
      is_active = true,
      config = EXCLUDED.config,
      source_asset_id = EXCLUDED.source_asset_id,
      source_ownership_level = EXCLUDED.source_ownership_level,
      source_owner_key = EXCLUDED.source_owner_key
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
    'total_navigation_items', (SELECT count(*) FROM public.core_navigation_items WHERE tenant_id = _tenant_id AND is_active)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_navigation_assets_for_tenant(uuid, text) TO authenticated;
