-- Sprint 2B — Generic Task Engine
-- Additive migration. Legacy task_assignments/order/station data is preserved untouched.

-- ============================================================================
-- 1) Generic task entity
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  capability_key text REFERENCES public.core_capability_registry(capability_key),
  task_key text,
  title text NOT NULL,
  description text,
  canonical_status text NOT NULL DEFAULT 'pending' CHECK (canonical_status IN ('pending','assigned','in_progress','waiting','completed','cancelled')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assigned_actor_type text NOT NULL DEFAULT 'user' CHECK (assigned_actor_type IN ('user','employee','team','system','external')),
  assigned_actor_id uuid,
  assigned_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  started_at timestamptz,
  waiting_reason text,
  due_at timestamptz,
  sla_due_at timestamptz,
  sla_breached boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_entity text,
  source_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  attachment_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.core_tasks IS 'Generic atomic action assigned to an Actor/team/system. Not tied to Laundry stations or legacy task_assignments.';
COMMENT ON COLUMN public.core_tasks.canonical_status IS 'pending, assigned, in_progress, waiting, completed, cancelled';
COMMENT ON COLUMN public.core_tasks.assigned_actor_type IS 'Generic actor target type. Employee-specific FK is optional compatibility.';
COMMENT ON COLUMN public.core_tasks.source_entity IS 'Optional polymorphic source entity. No FK by design.';

CREATE INDEX IF NOT EXISTS idx_core_tasks_tenant_status ON public.core_tasks(tenant_id, canonical_status);
CREATE INDEX IF NOT EXISTS idx_core_tasks_work_order ON public.core_tasks(work_order_id) WHERE work_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_tasks_capability ON public.core_tasks(tenant_id, capability_key);
CREATE INDEX IF NOT EXISTS idx_core_tasks_actor ON public.core_tasks(tenant_id, assigned_actor_type, assigned_actor_id) WHERE assigned_actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_tasks_employee ON public.core_tasks(assigned_employee_id) WHERE assigned_employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_tasks_due_at ON public.core_tasks(tenant_id, due_at) WHERE due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_tasks_source ON public.core_tasks(tenant_id, source_entity, source_id) WHERE source_entity IS NOT NULL AND source_id IS NOT NULL;

ALTER TABLE public.core_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_tasks_tenant_all ON public.core_tasks;
CREATE POLICY core_tasks_tenant_all ON public.core_tasks
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

-- ============================================================================
-- 2) Dependencies between tasks
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.core_tasks(id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES public.core_tasks(id) ON DELETE CASCADE,
  dependency_type text NOT NULL DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start','start_to_start','finish_to_finish','blocks')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, depends_on_task_id),
  CHECK (task_id <> depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_core_task_dependencies_task ON public.core_task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_core_task_dependencies_depends ON public.core_task_dependencies(depends_on_task_id);

ALTER TABLE public.core_task_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_task_dependencies_tenant_all ON public.core_task_dependencies;
CREATE POLICY core_task_dependencies_tenant_all ON public.core_task_dependencies
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

-- ============================================================================
-- 3) Task activity log
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_task_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.core_tasks(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_status text,
  to_status text,
  comment text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_core_task_activity_task ON public.core_task_activity(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_core_task_activity_tenant ON public.core_task_activity(tenant_id, created_at DESC);

ALTER TABLE public.core_task_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_task_activity_tenant_all ON public.core_task_activity;
CREATE POLICY core_task_activity_tenant_all ON public.core_task_activity
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

-- ============================================================================
-- 4) Updated-at and side effects
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_core_tasks_updated()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();

  IF NEW.canonical_status = 'assigned' AND NEW.assigned_at IS NULL THEN
    NEW.assigned_at := now();
  END IF;

  IF NEW.canonical_status = 'in_progress' AND NEW.started_at IS NULL THEN
    NEW.started_at := now();
  END IF;

  IF NEW.canonical_status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
    NEW.completed_by := COALESCE(NEW.completed_by, auth.uid());
  END IF;

  IF NEW.canonical_status = 'cancelled' AND NEW.cancelled_at IS NULL THEN
    NEW.cancelled_at := now();
    NEW.cancelled_by := COALESCE(NEW.cancelled_by, auth.uid());
  END IF;

  IF NEW.sla_due_at IS NOT NULL AND NEW.canonical_status NOT IN ('completed','cancelled') AND now() > NEW.sla_due_at THEN
    NEW.sla_breached := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_core_tasks_updated ON public.core_tasks;
CREATE TRIGGER trg_core_tasks_updated
BEFORE INSERT OR UPDATE ON public.core_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_core_tasks_updated();

CREATE OR REPLACE FUNCTION public.record_core_task_status_activity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.core_task_activity(tenant_id, task_id, activity_type, actor_user_id, to_status, comment, metadata)
    VALUES (NEW.tenant_id, NEW.id, 'task_created', auth.uid(), NEW.canonical_status, 'Task created', '{}'::jsonb);
  ELSIF TG_OP = 'UPDATE' AND OLD.canonical_status IS DISTINCT FROM NEW.canonical_status THEN
    INSERT INTO public.core_task_activity(tenant_id, task_id, activity_type, actor_user_id, from_status, to_status, comment, metadata)
    VALUES (NEW.tenant_id, NEW.id, 'status_changed', auth.uid(), OLD.canonical_status, NEW.canonical_status, NULL, '{}'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_core_task_status_activity ON public.core_tasks;
CREATE TRIGGER trg_core_task_status_activity
AFTER INSERT OR UPDATE OF canonical_status ON public.core_tasks
FOR EACH ROW EXECUTE FUNCTION public.record_core_task_status_activity();

-- ============================================================================
-- 5) Generic task functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_core_task(
  _tenant_id uuid,
  _title text,
  _work_order_id uuid DEFAULT NULL,
  _capability_key text DEFAULT 'workflow',
  _description text DEFAULT NULL,
  _priority text DEFAULT 'normal',
  _due_at timestamptz DEFAULT NULL,
  _assigned_actor_type text DEFAULT 'user',
  _assigned_actor_id uuid DEFAULT NULL,
  _assigned_employee_id uuid DEFAULT NULL,
  _source_entity text DEFAULT NULL,
  _source_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _attachment_refs jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF _tenant_id IS NULL THEN RAISE EXCEPTION 'tenant_id is required'; END IF;
  IF NULLIF(trim(_title), '') IS NULL THEN RAISE EXCEPTION 'title is required'; END IF;
  IF auth.uid() IS NOT NULL AND NOT public.can_access_tenant(_tenant_id) THEN RAISE EXCEPTION 'Access denied'; END IF;

  IF _work_order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.work_orders WHERE id=_work_order_id AND tenant_id=_tenant_id) THEN
    RAISE EXCEPTION 'Work order not found in tenant';
  END IF;

  IF _capability_key IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.core_capability_registry WHERE capability_key=_capability_key AND enabled) THEN
    RAISE EXCEPTION 'Unknown capability_key: %', _capability_key;
  END IF;

  IF _priority NOT IN ('low','normal','high','urgent') THEN RAISE EXCEPTION 'Invalid priority: %', _priority; END IF;
  IF _assigned_actor_type NOT IN ('user','employee','team','system','external') THEN RAISE EXCEPTION 'Invalid assigned_actor_type: %', _assigned_actor_type; END IF;

  INSERT INTO public.core_tasks(
    tenant_id, work_order_id, capability_key, title, description, priority, due_at,
    assigned_actor_type, assigned_actor_id, assigned_employee_id, assigned_by,
    source_entity, source_id, metadata, attachment_refs, created_by,
    canonical_status
  ) VALUES (
    _tenant_id, _work_order_id, _capability_key, _title, _description, _priority, _due_at,
    _assigned_actor_type, _assigned_actor_id, _assigned_employee_id, auth.uid(),
    _source_entity, _source_id, COALESCE(_metadata,'{}'::jsonb), COALESCE(_attachment_refs,'[]'::jsonb), auth.uid(),
    CASE WHEN _assigned_actor_id IS NOT NULL OR _assigned_employee_id IS NOT NULL THEN 'assigned' ELSE 'pending' END
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_core_task(uuid, text, uuid, text, text, text, timestamptz, text, uuid, uuid, text, uuid, jsonb, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.transition_core_task(
  _tenant_id uuid,
  _task_id uuid,
  _next_status text,
  _comment text DEFAULT NULL,
  _metadata_patch jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status text;
  dependency_blockers int := 0;
  allowed boolean := false;
BEGIN
  IF _tenant_id IS NULL OR _task_id IS NULL THEN RAISE EXCEPTION 'tenant_id and task_id are required'; END IF;
  IF auth.uid() IS NOT NULL AND NOT public.can_access_tenant(_tenant_id) THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT canonical_status INTO current_status FROM public.core_tasks WHERE id=_task_id AND tenant_id=_tenant_id;
  IF current_status IS NULL THEN RAISE EXCEPTION 'Task not found'; END IF;
  IF _next_status NOT IN ('pending','assigned','in_progress','waiting','completed','cancelled') THEN RAISE EXCEPTION 'Invalid task status: %', _next_status; END IF;

  IF _next_status IN ('in_progress','completed') THEN
    SELECT count(*) INTO dependency_blockers
    FROM public.core_task_dependencies d
    JOIN public.core_tasks dep ON dep.id=d.depends_on_task_id
    WHERE d.task_id=_task_id
      AND d.tenant_id=_tenant_id
      AND d.dependency_type IN ('finish_to_start','blocks')
      AND dep.canonical_status <> 'completed';
    IF dependency_blockers > 0 THEN
      RAISE EXCEPTION 'Task dependencies are not completed';
    END IF;
  END IF;

  allowed :=
    (current_status = _next_status)
    OR (current_status = 'pending' AND _next_status IN ('assigned','in_progress','waiting','cancelled'))
    OR (current_status = 'assigned' AND _next_status IN ('in_progress','waiting','cancelled'))
    OR (current_status = 'in_progress' AND _next_status IN ('waiting','completed','cancelled'))
    OR (current_status = 'waiting' AND _next_status IN ('assigned','in_progress','cancelled'))
    OR (current_status = 'completed' AND _next_status = 'completed')
    OR (current_status = 'cancelled' AND _next_status = 'cancelled');

  IF NOT allowed THEN RAISE EXCEPTION 'Invalid task transition from % to %', current_status, _next_status; END IF;

  UPDATE public.core_tasks
  SET canonical_status=_next_status,
      metadata=COALESCE(metadata,'{}'::jsonb) || COALESCE(_metadata_patch,'{}'::jsonb),
      waiting_reason=CASE WHEN _next_status='waiting' THEN _comment ELSE waiting_reason END
  WHERE id=_task_id AND tenant_id=_tenant_id;

  IF _comment IS NOT NULL THEN
    INSERT INTO public.core_task_activity(tenant_id, task_id, activity_type, actor_user_id, from_status, to_status, comment, metadata)
    VALUES (_tenant_id, _task_id, 'comment', auth.uid(), current_status, _next_status, _comment, COALESCE(_metadata_patch,'{}'::jsonb));
  END IF;

  RETURN jsonb_build_object('task_id', _task_id, 'from', current_status, 'to', _next_status, 'valid', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_core_task(uuid, uuid, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.add_core_task_dependency(
  _tenant_id uuid,
  _task_id uuid,
  _depends_on_task_id uuid,
  _dependency_type text DEFAULT 'finish_to_start',
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dep_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_access_tenant(_tenant_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  IF _dependency_type NOT IN ('finish_to_start','start_to_start','finish_to_finish','blocks') THEN RAISE EXCEPTION 'Invalid dependency_type: %', _dependency_type; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.core_tasks WHERE id=_task_id AND tenant_id=_tenant_id) THEN RAISE EXCEPTION 'Task not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.core_tasks WHERE id=_depends_on_task_id AND tenant_id=_tenant_id) THEN RAISE EXCEPTION 'Dependency task not found'; END IF;

  INSERT INTO public.core_task_dependencies(tenant_id, task_id, depends_on_task_id, dependency_type, metadata)
  VALUES (_tenant_id, _task_id, _depends_on_task_id, _dependency_type, COALESCE(_metadata,'{}'::jsonb))
  ON CONFLICT (task_id, depends_on_task_id) DO UPDATE SET dependency_type=EXCLUDED.dependency_type, metadata=EXCLUDED.metadata
  RETURNING id INTO dep_id;

  RETURN dep_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_core_task_dependency(uuid, uuid, uuid, text, jsonb) TO authenticated;

-- ============================================================================
-- 6) Canonical read view
-- ============================================================================

CREATE OR REPLACE VIEW public.v_core_tasks
WITH (security_invoker = true)
AS
SELECT
  t.id,
  t.tenant_id,
  t.work_order_id,
  t.capability_key,
  t.task_key,
  t.title,
  t.description,
  t.canonical_status,
  t.priority,
  t.assigned_actor_type,
  t.assigned_actor_id,
  t.assigned_employee_id,
  t.assigned_by,
  t.assigned_at,
  t.started_at,
  t.waiting_reason,
  t.due_at,
  t.sla_due_at,
  t.sla_breached,
  t.completed_at,
  t.completed_by,
  t.cancelled_at,
  t.cancelled_by,
  t.source_entity,
  t.source_id,
  t.metadata,
  t.attachment_refs,
  t.created_by,
  t.created_at,
  t.updated_at,
  wo.title AS work_order_title,
  wo.canonical_status AS work_order_status
FROM public.core_tasks t
LEFT JOIN public.work_orders wo ON wo.id=t.work_order_id;

GRANT SELECT ON public.v_core_tasks TO authenticated;
