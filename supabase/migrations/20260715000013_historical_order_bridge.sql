-- Sprint 2D — Historical Bridge
-- Read-only bridge from legacy Orders/Service Units to canonical Work Order/Task concepts.
-- No historical Orders, Journal Entries, IDs, or legacy tables are modified.

-- ============================================================================
-- 1) Optional explicit legacy link registry for future non-destructive mappings
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_legacy_record_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  legacy_entity text NOT NULL,
  legacy_id uuid NOT NULL,
  canonical_entity text NOT NULL,
  canonical_id uuid,
  virtual_key text,
  link_type text NOT NULL DEFAULT 'read_only_bridge' CHECK (link_type IN ('read_only_bridge','explicit_mapping','migration_candidate','archived_reference')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, legacy_entity, legacy_id, canonical_entity, link_type)
);

COMMENT ON TABLE public.core_legacy_record_links IS 'Optional ORGANIZATION-owned mapping registry for non-destructive historical bridge links. Does not mutate legacy records.';

CREATE INDEX IF NOT EXISTS idx_core_legacy_links_tenant ON public.core_legacy_record_links(tenant_id, legacy_entity, canonical_entity);
CREATE INDEX IF NOT EXISTS idx_core_legacy_links_virtual ON public.core_legacy_record_links(tenant_id, virtual_key) WHERE virtual_key IS NOT NULL;

ALTER TABLE public.core_legacy_record_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_legacy_record_links_tenant_all ON public.core_legacy_record_links;
CREATE POLICY core_legacy_record_links_tenant_all ON public.core_legacy_record_links
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

-- ============================================================================
-- 2) Status mapping helpers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.map_order_status_to_canonical_work_order(_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _status
    WHEN 'received' THEN 'created'
    WHEN 'cleaning' THEN 'in_progress'
    WHEN 'ironing' THEN 'in_progress'
    WHEN 'packing' THEN 'in_progress'
    WHEN 'ready' THEN 'completed'
    WHEN 'out_for_delivery' THEN 'in_progress'
    WHEN 'delivered' THEN 'completed'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'created'
  END;
$$;

CREATE OR REPLACE FUNCTION public.map_unit_stage_to_canonical_task(_stage text, _status text DEFAULT NULL)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(_status,'') IN ('delivered','completed') THEN 'completed'
    WHEN COALESCE(_stage,'') IN ('delivered','ready') THEN 'completed'
    WHEN COALESCE(_stage,'') IN ('cleaning','ironing','packing','qc','delivery','sorting','intake','reception','drying-assembly','drying_assembly') THEN 'in_progress'
    ELSE 'pending'
  END;
$$;

-- ============================================================================
-- 3) Read-only Order → virtual Work Order bridge
-- ============================================================================

CREATE OR REPLACE VIEW public.v_order_work_order_bridge
WITH (security_invoker = true)
AS
SELECT
  o.tenant_id,
  o.id AS legacy_order_id,
  ('order:' || o.id::text) AS virtual_work_order_key,
  NULL::uuid AS canonical_work_order_id,
  'order'::text AS source_entity,
  o.id AS source_id,
  'orders'::text AS legacy_entity,
  o.order_number::text AS legacy_number,
  COALESCE('Order #' || o.order_number::text, 'Legacy Order') AS title,
  o.customer_id,
  o.branch_id,
  'orders'::text AS capability_key,
  public.map_order_status_to_canonical_work_order(o.status::text) AS canonical_status,
  o.status::text AS legacy_status,
  CASE WHEN o.is_urgent THEN 'urgent' ELSE 'normal' END AS priority,
  o.promised_delivery_at AS due_at,
  o.total AS total_amount,
  o.payment_status::text AS payment_status,
  o.created_at,
  o.updated_at,
  o.delivered_at AS completed_at,
  jsonb_build_object(
    'bridge_type','virtual_read_only',
    'legacy_table','orders',
    'order_type', o.order_type,
    'public_token', o.public_token,
    'invoice_finalized_at', o.invoice_finalized_at
  ) AS metadata
FROM public.orders o;

COMMENT ON VIEW public.v_order_work_order_bridge IS 'Read-only virtual bridge exposing legacy Orders as canonical Work Order-like records. Does not create or modify work_orders.';
GRANT SELECT ON public.v_order_work_order_bridge TO authenticated;

-- ============================================================================
-- 4) Read-only Service Unit / Order Item → virtual Task bridge
-- ============================================================================

CREATE OR REPLACE VIEW public.v_order_task_bridge
WITH (security_invoker = true)
AS
SELECT
  su.tenant_id,
  su.id AS legacy_service_unit_id,
  ('service_unit:' || su.id::text) AS virtual_task_key,
  NULL::uuid AS canonical_task_id,
  ('order:' || su.order_id::text) AS virtual_work_order_key,
  su.order_id AS legacy_order_id,
  su.order_item_id,
  'service_units'::text AS legacy_entity,
  su.id AS legacy_id,
  COALESCE(su.name, su.garment_type, 'Legacy Service Unit') AS title,
  su.current_stage AS work_area_key,
  'workflow'::text AS capability_key,
  public.map_unit_stage_to_canonical_task(su.current_stage, su.status) AS canonical_status,
  su.status AS legacy_status,
  'normal'::text AS priority,
  su.assigned_ironing_employee_id AS assigned_employee_id,
  su.ironing_assigned_at AS assigned_at,
  su.ironing_completed_at AS completed_at,
  su.unit_price,
  su.line_value,
  jsonb_build_object(
    'bridge_type','virtual_read_only',
    'legacy_table','service_units',
    'unit_number', su.unit_number,
    'label_code', su.label_code,
    'service_type', su.service_type,
    'garment_type', su.garment_type
  ) AS metadata
FROM public.service_units su
UNION ALL
SELECT
  oi.tenant_id,
  oi.id AS legacy_service_unit_id,
  ('order_item:' || oi.id::text) AS virtual_task_key,
  NULL::uuid AS canonical_task_id,
  ('order:' || oi.order_id::text) AS virtual_work_order_key,
  oi.order_id AS legacy_order_id,
  oi.id AS order_item_id,
  'order_items'::text AS legacy_entity,
  oi.id AS legacy_id,
  oi.name AS title,
  NULL::text AS work_area_key,
  'orders'::text AS capability_key,
  'pending'::text AS canonical_status,
  NULL::text AS legacy_status,
  'normal'::text AS priority,
  NULL::uuid AS assigned_employee_id,
  NULL::timestamptz AS assigned_at,
  NULL::timestamptz AS completed_at,
  oi.unit_price,
  oi.line_total AS line_value,
  jsonb_build_object(
    'bridge_type','virtual_read_only',
    'legacy_table','order_items',
    'qty', oi.qty,
    'service_type', oi.service_type
  ) AS metadata
FROM public.order_items oi
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_units su WHERE su.order_item_id = oi.id
);

COMMENT ON VIEW public.v_order_task_bridge IS 'Read-only virtual bridge exposing legacy Service Units / Order Items as canonical Task-like records. Does not create or modify core_tasks.';
GRANT SELECT ON public.v_order_task_bridge TO authenticated;

-- ============================================================================
-- 5) Bridge validation function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_legacy_order_bridge(_tenant_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'tenant_id', _tenant_id,
    'legacy_orders', (SELECT count(*) FROM public.orders WHERE tenant_id=_tenant_id),
    'virtual_work_orders', (SELECT count(*) FROM public.v_order_work_order_bridge WHERE tenant_id=_tenant_id),
    'legacy_order_items', (SELECT count(*) FROM public.order_items WHERE tenant_id=_tenant_id),
    'legacy_service_units', (SELECT count(*) FROM public.service_units WHERE tenant_id=_tenant_id),
    'virtual_tasks', (SELECT count(*) FROM public.v_order_task_bridge WHERE tenant_id=_tenant_id),
    'orders_missing_customer', (
      SELECT count(*)
      FROM public.orders o
      LEFT JOIN public.customers c ON c.id=o.customer_id
      WHERE o.tenant_id=_tenant_id AND c.id IS NULL
    ),
    'order_items_missing_order', (
      SELECT count(*)
      FROM public.order_items oi
      LEFT JOIN public.orders o ON o.id=oi.order_id
      WHERE oi.tenant_id=_tenant_id AND o.id IS NULL
    ),
    'service_units_missing_order', (
      SELECT count(*)
      FROM public.service_units su
      LEFT JOIN public.orders o ON o.id=su.order_id
      WHERE su.tenant_id=_tenant_id AND o.id IS NULL
    ),
    'bridge_complete',
      (SELECT count(*) FROM public.orders WHERE tenant_id=_tenant_id) =
      (SELECT count(*) FROM public.v_order_work_order_bridge WHERE tenant_id=_tenant_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.validate_legacy_order_bridge(uuid) TO authenticated;
