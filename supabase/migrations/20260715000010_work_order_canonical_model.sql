-- Sprint 2A — Work Order Canonical Model
-- Additive migration. No historical orders, journal entries, or legacy work_orders are migrated.

-- ============================================================================
-- 1) Extend existing work_orders into canonical execution container
-- ============================================================================

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS canonical_status text NOT NULL DEFAULT 'created' CHECK (canonical_status IN ('draft','created','in_progress','blocked','completed','cancelled')),
  ADD COLUMN IF NOT EXISTS capability_key text REFERENCES public.core_capability_registry(capability_key),
  ADD COLUMN IF NOT EXISTS resource_type text NOT NULL DEFAULT 'work_order',
  ADD COLUMN IF NOT EXISTS source_entity text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS parent_work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS attachment_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON TABLE public.work_orders IS 'Canonical internal execution container for organization work. Commercial customer requests remain Orders; execution happens through Work Orders and Tasks.';
COMMENT ON COLUMN public.work_orders.canonical_status IS 'Industry-agnostic canonical lifecycle: draft, created, in_progress, blocked, completed, cancelled. Legacy status is preserved separately for compatibility.';
COMMENT ON COLUMN public.work_orders.capability_key IS 'Capability that owns this work order behavior, e.g. workflow, field_service, maintenance. Not an industry name.';
COMMENT ON COLUMN public.work_orders.source_entity IS 'Optional source entity that caused this work order, e.g. order, appointment, asset, internal_request.';
COMMENT ON COLUMN public.work_orders.source_id IS 'Optional source record ID. No FK by design because sources are polymorphic.';
COMMENT ON COLUMN public.work_orders.parent_work_order_id IS 'Optional parent Work Order for parent/child execution trees.';
COMMENT ON COLUMN public.work_orders.attachment_refs IS 'Generic attachment references. Actual file/object storage remains external.';
COMMENT ON COLUMN public.work_orders.metadata IS 'Generic configuration/runtime metadata. Business-specific shape belongs to capability/template config.';

CREATE INDEX IF NOT EXISTS idx_work_orders_canonical_status ON public.work_orders(tenant_id, canonical_status);
CREATE INDEX IF NOT EXISTS idx_work_orders_capability ON public.work_orders(tenant_id, capability_key);
CREATE INDEX IF NOT EXISTS idx_work_orders_source ON public.work_orders(tenant_id, source_entity, source_id) WHERE source_entity IS NOT NULL AND source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_orders_parent ON public.work_orders(parent_work_order_id) WHERE parent_work_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_orders_due_at ON public.work_orders(tenant_id, due_at) WHERE due_at IS NOT NULL;

-- ============================================================================
-- 2) Lifecycle sync helper for compatibility status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.map_canonical_work_order_status(_canonical_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _canonical_status
    WHEN 'draft' THEN 'open'
    WHEN 'created' THEN 'open'
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'blocked' THEN 'waiting'
    WHEN 'completed' THEN 'completed'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'open'
  END;
$$;

CREATE OR REPLACE FUNCTION public.set_work_order_canonical_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Keep the legacy status column compatible without making it the canonical source.
  NEW.status := public.map_canonical_work_order_status(NEW.canonical_status);

  IF NEW.canonical_status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
    NEW.completed_by := COALESCE(NEW.completed_by, auth.uid());
  END IF;

  IF NEW.canonical_status = 'cancelled' AND NEW.cancelled_at IS NULL THEN
    NEW.cancelled_at := now();
    NEW.cancelled_by := COALESCE(NEW.cancelled_by, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_work_order_canonical_side_effects ON public.work_orders;
CREATE TRIGGER trg_work_order_canonical_side_effects
BEFORE INSERT OR UPDATE OF canonical_status ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.set_work_order_canonical_side_effects();

-- ============================================================================
-- 3) Generic create function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_canonical_work_order(
  _tenant_id uuid,
  _workflow_id uuid,
  _title text,
  _capability_key text DEFAULT 'workflow',
  _branch_id uuid DEFAULT NULL,
  _customer_id uuid DEFAULT NULL,
  _description text DEFAULT NULL,
  _priority text DEFAULT 'normal',
  _due_at timestamptz DEFAULT NULL,
  _source_entity text DEFAULT NULL,
  _source_id uuid DEFAULT NULL,
  _parent_work_order_id uuid DEFAULT NULL,
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
  IF _workflow_id IS NULL THEN RAISE EXCEPTION 'workflow_id is required'; END IF;
  IF NULLIF(trim(_title), '') IS NULL THEN RAISE EXCEPTION 'title is required'; END IF;

  IF auth.uid() IS NOT NULL AND NOT public.can_access_tenant(_tenant_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF _capability_key IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.core_capability_registry WHERE capability_key = _capability_key AND enabled) THEN
    RAISE EXCEPTION 'Unknown capability_key: %', _capability_key;
  END IF;

  IF _priority NOT IN ('low','normal','high','urgent') THEN
    RAISE EXCEPTION 'Invalid priority: %', _priority;
  END IF;

  IF _parent_work_order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.work_orders WHERE id = _parent_work_order_id AND tenant_id = _tenant_id) THEN
    RAISE EXCEPTION 'Parent work order not found in tenant';
  END IF;

  INSERT INTO public.work_orders(
    tenant_id, branch_id, workflow_id, workflow_version_snapshot, title, description,
    customer_id, priority, due_at, source_entity, source_id, parent_work_order_id,
    metadata, attachment_refs, capability_key, canonical_status, created_by
  ) VALUES (
    _tenant_id, _branch_id, _workflow_id, '{}'::jsonb, _title, _description,
    _customer_id, _priority, _due_at, _source_entity, _source_id, _parent_work_order_id,
    COALESCE(_metadata, '{}'::jsonb), COALESCE(_attachment_refs, '[]'::jsonb), _capability_key, 'created', auth.uid()
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.create_canonical_work_order IS 'Creates a generic canonical Work Order. Requires workflow_id because workflow definitions are still the execution path in current schema.';
GRANT EXECUTE ON FUNCTION public.create_canonical_work_order(uuid, uuid, text, text, uuid, uuid, text, text, timestamptz, text, uuid, uuid, jsonb, jsonb) TO authenticated;

-- ============================================================================
-- 4) Generic transition function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.transition_canonical_work_order(
  _tenant_id uuid,
  _work_order_id uuid,
  _next_status text,
  _reason text DEFAULT NULL,
  _metadata_patch jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status text;
  allowed boolean := false;
BEGIN
  IF _tenant_id IS NULL OR _work_order_id IS NULL THEN RAISE EXCEPTION 'tenant_id and work_order_id are required'; END IF;
  IF auth.uid() IS NOT NULL AND NOT public.can_access_tenant(_tenant_id) THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT canonical_status INTO current_status FROM public.work_orders WHERE id=_work_order_id AND tenant_id=_tenant_id;
  IF current_status IS NULL THEN RAISE EXCEPTION 'Work order not found'; END IF;

  allowed :=
    (current_status = _next_status)
    OR (current_status = 'draft' AND _next_status IN ('created','cancelled'))
    OR (current_status = 'created' AND _next_status IN ('in_progress','blocked','cancelled'))
    OR (current_status = 'in_progress' AND _next_status IN ('blocked','completed','cancelled'))
    OR (current_status = 'blocked' AND _next_status IN ('in_progress','cancelled'))
    OR (current_status = 'completed' AND _next_status = 'completed')
    OR (current_status = 'cancelled' AND _next_status = 'cancelled');

  IF _next_status NOT IN ('draft','created','in_progress','blocked','completed','cancelled') THEN
    RAISE EXCEPTION 'Invalid canonical status: %', _next_status;
  END IF;

  IF NOT allowed THEN
    RAISE EXCEPTION 'Invalid work order transition from % to %', current_status, _next_status;
  END IF;

  UPDATE public.work_orders
  SET canonical_status = _next_status,
      blocked_reason = CASE WHEN _next_status='blocked' THEN _reason ELSE blocked_reason END,
      metadata = COALESCE(metadata,'{}'::jsonb) || COALESCE(_metadata_patch,'{}'::jsonb)
  WHERE id=_work_order_id AND tenant_id=_tenant_id;

  RETURN jsonb_build_object('work_order_id', _work_order_id, 'from', current_status, 'to', _next_status, 'valid', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_canonical_work_order(uuid, uuid, text, text, jsonb) TO authenticated;

-- ============================================================================
-- 5) Canonical read view
-- ============================================================================

CREATE OR REPLACE VIEW public.v_canonical_work_orders
WITH (security_invoker = true)
AS
SELECT
  wo.id,
  wo.tenant_id,
  wo.branch_id,
  wo.capability_key,
  wo.workflow_id,
  wo.current_stage_id,
  wo.title,
  wo.description,
  wo.customer_id,
  wo.canonical_status,
  wo.status AS legacy_status,
  wo.priority,
  wo.due_at,
  wo.sla_due_at,
  wo.sla_breached,
  wo.source_entity,
  wo.source_id,
  wo.parent_work_order_id,
  wo.metadata,
  wo.attachment_refs,
  wo.created_by,
  wo.created_at,
  wo.updated_at,
  wo.completed_at,
  wo.cancelled_at
FROM public.work_orders wo;

GRANT SELECT ON public.v_canonical_work_orders TO authenticated;
