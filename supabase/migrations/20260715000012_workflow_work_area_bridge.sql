-- Sprint 2C — Station / Workflow Bridge (generic Work Area bridge)
-- Additive migration. Stations are modeled as configurable work areas/resources, not Core industry concepts.

-- ============================================================================
-- 1) Generic work areas
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_work_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  capability_key text REFERENCES public.core_capability_registry(capability_key),
  work_area_key text NOT NULL,
  name_ar text NOT NULL,
  name_en text,
  resource_type text NOT NULL DEFAULT 'work_area',
  required_permissions text[] NOT NULL DEFAULT ARRAY[]::text[],
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, work_area_key)
);

COMMENT ON TABLE public.core_work_areas IS 'Generic configurable work areas/resources used by workflows. They may represent stations, teams, queues, departments, or field work areas depending on template/capability configuration.';
COMMENT ON COLUMN public.core_work_areas.work_area_key IS 'Template/capability-defined key. Core does not interpret industry meaning.';

CREATE INDEX IF NOT EXISTS idx_core_work_areas_tenant ON public.core_work_areas(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_core_work_areas_capability ON public.core_work_areas(tenant_id, capability_key);

ALTER TABLE public.core_work_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_work_areas_tenant_all ON public.core_work_areas;
CREATE POLICY core_work_areas_tenant_all ON public.core_work_areas
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

DROP TRIGGER IF EXISTS trg_core_work_areas_updated ON public.core_work_areas;
CREATE TRIGGER trg_core_work_areas_updated
BEFORE UPDATE ON public.core_work_areas
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

-- ============================================================================
-- 2) Workflow stage to work area bindings
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_workflow_stage_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.workflow_stages_v2(id) ON DELETE CASCADE,
  work_area_id uuid NOT NULL REFERENCES public.core_work_areas(id) ON DELETE CASCADE,
  assignment_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, stage_id, work_area_id)
);

CREATE INDEX IF NOT EXISTS idx_core_stage_bindings_stage ON public.core_workflow_stage_bindings(stage_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_core_stage_bindings_area ON public.core_workflow_stage_bindings(work_area_id) WHERE is_active;

ALTER TABLE public.core_workflow_stage_bindings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_workflow_stage_bindings_tenant_all ON public.core_workflow_stage_bindings;
CREATE POLICY core_workflow_stage_bindings_tenant_all ON public.core_workflow_stage_bindings
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

DROP TRIGGER IF EXISTS trg_core_workflow_stage_bindings_updated ON public.core_workflow_stage_bindings;
CREATE TRIGGER trg_core_workflow_stage_bindings_updated
BEFORE UPDATE ON public.core_workflow_stage_bindings
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

-- ============================================================================
-- 3) Task work area assignment and workflow events
-- ============================================================================

ALTER TABLE public.core_tasks
  ADD COLUMN IF NOT EXISTS work_area_id uuid REFERENCES public.core_work_areas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_core_tasks_work_area ON public.core_tasks(work_area_id) WHERE work_area_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.core_workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.core_tasks(id) ON DELETE CASCADE,
  workflow_id uuid REFERENCES public.workflow_definitions(id) ON DELETE SET NULL,
  from_stage_id uuid REFERENCES public.workflow_stages_v2(id) ON DELETE SET NULL,
  to_stage_id uuid REFERENCES public.workflow_stages_v2(id) ON DELETE SET NULL,
  work_area_id uuid REFERENCES public.core_work_areas(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  comment text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_core_workflow_events_tenant ON public.core_workflow_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_core_workflow_events_work_order ON public.core_workflow_events(work_order_id, created_at DESC) WHERE work_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_workflow_events_task ON public.core_workflow_events(task_id, created_at DESC) WHERE task_id IS NOT NULL;

ALTER TABLE public.core_workflow_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_workflow_events_tenant_all ON public.core_workflow_events;
CREATE POLICY core_workflow_events_tenant_all ON public.core_workflow_events
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

-- ============================================================================
-- 4) Generic helpers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_core_work_area(
  _tenant_id uuid,
  _work_area_key text,
  _name_ar text,
  _name_en text DEFAULT NULL,
  _capability_key text DEFAULT 'workflow',
  _resource_type text DEFAULT 'work_area',
  _required_permissions text[] DEFAULT ARRAY[]::text[],
  _metadata jsonb DEFAULT '{}'::jsonb,
  _sort_order int DEFAULT 100
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  area_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_access_tenant(_tenant_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  IF NULLIF(trim(_work_area_key),'') IS NULL THEN RAISE EXCEPTION 'work_area_key is required'; END IF;
  IF NULLIF(trim(_name_ar),'') IS NULL THEN RAISE EXCEPTION 'name_ar is required'; END IF;

  INSERT INTO public.core_work_areas(tenant_id, capability_key, work_area_key, name_ar, name_en, resource_type, required_permissions, metadata, sort_order, is_active)
  VALUES (_tenant_id, _capability_key, _work_area_key, _name_ar, _name_en, _resource_type, COALESCE(_required_permissions, ARRAY[]::text[]), COALESCE(_metadata,'{}'::jsonb), COALESCE(_sort_order,100), true)
  ON CONFLICT (tenant_id, work_area_key) DO UPDATE SET
    capability_key=EXCLUDED.capability_key,
    name_ar=EXCLUDED.name_ar,
    name_en=EXCLUDED.name_en,
    resource_type=EXCLUDED.resource_type,
    required_permissions=EXCLUDED.required_permissions,
    metadata=EXCLUDED.metadata,
    sort_order=EXCLUDED.sort_order,
    is_active=true
  RETURNING id INTO area_id;

  RETURN area_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_core_work_area(uuid, text, text, text, text, text, text[], jsonb, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.bind_workflow_stage_to_work_area(
  _tenant_id uuid,
  _workflow_id uuid,
  _stage_id uuid,
  _work_area_id uuid,
  _assignment_rule jsonb DEFAULT '{}'::jsonb,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  binding_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_access_tenant(_tenant_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workflow_stages_v2 WHERE id=_stage_id AND workflow_id=_workflow_id) THEN RAISE EXCEPTION 'Stage does not belong to workflow'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.core_work_areas WHERE id=_work_area_id AND tenant_id=_tenant_id AND is_active) THEN RAISE EXCEPTION 'Work area not found'; END IF;

  INSERT INTO public.core_workflow_stage_bindings(tenant_id, workflow_id, stage_id, work_area_id, assignment_rule, metadata, is_active)
  VALUES (_tenant_id, _workflow_id, _stage_id, _work_area_id, COALESCE(_assignment_rule,'{}'::jsonb), COALESCE(_metadata,'{}'::jsonb), true)
  ON CONFLICT (tenant_id, stage_id, work_area_id) DO UPDATE SET
    assignment_rule=EXCLUDED.assignment_rule,
    metadata=EXCLUDED.metadata,
    is_active=true
  RETURNING id INTO binding_id;

  RETURN binding_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bind_workflow_stage_to_work_area(uuid, uuid, uuid, uuid, jsonb, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.transition_work_order_stage(
  _tenant_id uuid,
  _work_order_id uuid,
  _to_stage_id uuid,
  _comment text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _create_stage_task boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wo record;
  area_id uuid;
  task_id uuid;
  transition_exists boolean;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_access_tenant(_tenant_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  SELECT * INTO wo FROM public.work_orders WHERE id=_work_order_id AND tenant_id=_tenant_id;
  IF wo.id IS NULL THEN RAISE EXCEPTION 'Work order not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workflow_stages_v2 WHERE id=_to_stage_id AND workflow_id=wo.workflow_id) THEN RAISE EXCEPTION 'Target stage does not belong to work order workflow'; END IF;

  IF wo.current_stage_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.workflow_transitions tr
      WHERE tr.workflow_id=wo.workflow_id
        AND tr.from_stage_id=wo.current_stage_id
        AND tr.to_stage_id=_to_stage_id
    ) INTO transition_exists;
    IF NOT transition_exists THEN RAISE EXCEPTION 'Workflow transition is not allowed'; END IF;
  END IF;

  SELECT work_area_id INTO area_id
  FROM public.core_workflow_stage_bindings
  WHERE tenant_id=_tenant_id AND stage_id=_to_stage_id AND is_active
  ORDER BY created_at
  LIMIT 1;

  UPDATE public.work_orders
  SET current_stage_id=_to_stage_id,
      canonical_status=CASE WHEN canonical_status IN ('draft','created') THEN 'in_progress' ELSE canonical_status END,
      metadata=COALESCE(metadata,'{}'::jsonb) || COALESCE(_metadata,'{}'::jsonb)
  WHERE id=_work_order_id AND tenant_id=_tenant_id;

  IF _create_stage_task AND area_id IS NOT NULL THEN
    task_id := public.create_core_task(
      _tenant_id,
      'Work area task: ' || COALESCE((SELECT name_en FROM public.workflow_stages_v2 WHERE id=_to_stage_id), 'stage'),
      _work_order_id,
      COALESCE(wo.capability_key,'workflow'),
      _comment,
      COALESCE(wo.priority,'normal'),
      COALESCE(wo.due_at, wo.sla_due_at),
      'team',
      area_id,
      NULL,
      'workflow_stage',
      _to_stage_id,
      jsonb_build_object('generated_by','transition_work_order_stage','work_area_id',area_id),
      '[]'::jsonb
    );
    UPDATE public.core_tasks SET work_area_id=area_id WHERE id=task_id;
  END IF;

  INSERT INTO public.core_workflow_events(tenant_id, work_order_id, task_id, workflow_id, from_stage_id, to_stage_id, work_area_id, event_type, actor_user_id, comment, metadata)
  VALUES (_tenant_id, _work_order_id, task_id, wo.workflow_id, wo.current_stage_id, _to_stage_id, area_id, 'stage_transitioned', auth.uid(), _comment, COALESCE(_metadata,'{}'::jsonb));

  RETURN jsonb_build_object('work_order_id',_work_order_id,'from_stage_id',wo.current_stage_id,'to_stage_id',_to_stage_id,'work_area_id',area_id,'task_id',task_id,'valid',true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_work_order_stage(uuid, uuid, uuid, text, jsonb, boolean) TO authenticated;

-- ============================================================================
-- 5) Queue view
-- ============================================================================

CREATE OR REPLACE VIEW public.v_work_area_queue
WITH (security_invoker = true)
AS
SELECT
  wa.tenant_id,
  wa.id AS work_area_id,
  wa.work_area_key,
  wa.name_ar AS work_area_name_ar,
  wa.name_en AS work_area_name_en,
  t.id AS task_id,
  t.title AS task_title,
  t.canonical_status AS task_status,
  t.priority,
  t.due_at,
  t.work_order_id,
  wo.title AS work_order_title,
  wo.canonical_status AS work_order_status,
  t.assigned_actor_type,
  t.assigned_actor_id,
  t.assigned_employee_id,
  t.created_at
FROM public.core_work_areas wa
LEFT JOIN public.core_tasks t ON t.work_area_id=wa.id AND t.canonical_status NOT IN ('completed','cancelled')
LEFT JOIN public.work_orders wo ON wo.id=t.work_order_id;

GRANT SELECT ON public.v_work_area_queue TO authenticated;
