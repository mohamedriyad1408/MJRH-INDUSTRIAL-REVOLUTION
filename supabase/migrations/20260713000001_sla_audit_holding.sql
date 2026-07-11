-- MJRH v3 Phase 3-4 — SLA Engine, Audit Logs immutable, Holding Company basics
-- Zero-cost: pg_cron, append-only permissions, intercompany, approval chains

-- ============================================================================
-- SLA Engine for work_orders (v2)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_sla_breaches()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  breached_count int := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT wo.id, wo.tenant_id, wo.current_stage_id, ws.sla_target_mins, ws.sla_max_mins, ws.name_ar, ws.required_role
    FROM work_orders wo
    JOIN workflow_stages_v2 ws ON ws.id = wo.current_stage_id
    WHERE wo.status IN ('open','in_progress','waiting')
      AND wo.sla_due_at IS NOT NULL
      AND wo.sla_due_at < now()
      AND wo.sla_breached = false
  LOOP
    -- Mark as breached
    UPDATE work_orders SET sla_breached = true, updated_at = now() WHERE id = rec.id;

    -- Notification for target breach
    INSERT INTO app_notifications(tenant_id, audience, title, body, href, tone)
    VALUES (
      rec.tenant_id,
      rec.required_role || '',
      'تنبيه SLA: ' || rec.name_ar,
      'طلب عمل ' || rec.id || ' تجاوز وقت SLA المستهدف (' || rec.sla_target_mins || ' دقيقة) في مرحلة ' || rec.name_ar || '. الحالة: ' || rec.sla_max_mins || ' دقيقة كحد أقصى.',
      '/work-orders',
      'warning'
    );

    -- Auto-escalation if beyond max
    IF rec.sla_due_at + (rec.sla_max_mins || 0 || (rec.sla_target_mins * 2)) * interval '1 minute' < now() THEN
      INSERT INTO app_notifications(tenant_id, audience, title, body, href, tone)
      VALUES (
        rec.tenant_id,
        'owner',
        'تصعيد تلقائي SLA: ' || rec.name_ar,
        'طلب ' || rec.id || ' تجاوز الحد الأقصى (' || rec.sla_max_mins || ' دقيقة) — تم تصعيد للدور الأعلى تلقائياً.',
        '/executive',
        'danger'
      );
    END IF;

    breached_count := breached_count + 1;
  END LOOP;

  RETURN breached_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_sla_breaches() TO authenticated;

-- Try to schedule via pg_cron every 15 mins
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('check-sla-breaches', '*/15 * * * *', $$SELECT public.check_sla_breaches();$$);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- ============================================================================
-- Audit Logs — append-only enforced via permission (not just app logic)
-- ============================================================================

-- Ensure operation_events is append-only: revoke UPDATE/DELETE from authenticated, only service_role can modify
-- Note: Supabase default authenticated has ALL via RLS policies, but we can add restrictive policy

-- Create new table audit_logs_immutable for exportable logs (if not exists, else use operation_events)
CREATE TABLE IF NOT EXISTS public.audit_logs_immutable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON public.audit_logs_immutable(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs_immutable(entity_type, entity_id);

ALTER TABLE public.audit_logs_immutable ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_tenant_read ON public.audit_logs_immutable;
CREATE POLICY audit_logs_tenant_read ON public.audit_logs_immutable
FOR SELECT TO authenticated
USING (public.can_access_tenant(tenant_id));

-- Prevent UPDATE/DELETE for authenticated — only INSERT and SELECT allowed via RLS
-- We achieve this by NOT creating UPDATE/DELETE policies for authenticated
DROP POLICY IF EXISTS audit_logs_no_update ON public.audit_logs_immutable;
-- No UPDATE policy means UPDATE will be denied

DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs_immutable;
CREATE POLICY audit_logs_insert ON public.audit_logs_immutable
FOR INSERT TO authenticated
WITH CHECK (public.can_access_tenant(tenant_id));

GRANT SELECT, INSERT ON public.audit_logs_immutable TO authenticated;
GRANT ALL ON public.audit_logs_immutable TO service_role;

-- Function to export audit logs as CSV/JSON for external auditor
CREATE OR REPLACE FUNCTION public.export_audit_logs(_tenant_id uuid, _from date DEFAULT CURRENT_DATE - interval '30 days', _to date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'action', action,
      'entity_type', entity_type,
      'entity_id', entity_id,
      'actor_id', actor_id,
      'reason', reason,
      'created_at', created_at
    ) ORDER BY created_at DESC
  ) INTO result
  FROM audit_logs_immutable
  WHERE tenant_id = _tenant_id
    AND created_at::date BETWEEN _from AND _to;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.export_audit_logs(uuid, date, date) TO authenticated;

-- ============================================================================
-- Holding Company — Phase 4 basics (after success of hotel)
-- ============================================================================

-- Intercompany transactions for consolidated financials
CREATE TABLE IF NOT EXISTS public.intercompany_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid REFERENCES public.enterprises(id) ON DELETE CASCADE,
  from_tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  to_tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('service','loan','transfer','expense')),
  description text,
  eliminated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CHECK (from_tenant_id != to_tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_intercompany_enterprise ON public.intercompany_transactions(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_intercompany_from_to ON public.intercompany_transactions(from_tenant_id, to_tenant_id);

ALTER TABLE public.intercompany_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intercompany_tenant_all ON public.intercompany_transactions;
CREATE POLICY intercompany_tenant_all ON public.intercompany_transactions
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = from_tenant_id AND public.can_access_tenant(t.id))
  OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = to_tenant_id AND public.can_access_tenant(t.id))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = from_tenant_id AND public.can_access_tenant(t.id))
);

-- Consolidated P&L view (multi-entity, not just branches)
CREATE OR REPLACE VIEW public.v_consolidated_pnl
WITH (security_invoker = true)
AS
WITH tenant_pnl AS (
  SELECT 
    t.enterprise_id,
    t.id as tenant_id,
    t.name as tenant_name,
    COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0) as revenue,
    COALESCE((SELECT SUM(amount) FROM expenses e WHERE e.tenant_id = t.id), 0) as expenses
  FROM tenants t
  LEFT JOIN orders o ON o.tenant_id = t.id
  GROUP BY t.enterprise_id, t.id, t.name
),
intercompany AS (
  SELECT enterprise_id, SUM(amount) as intercompany_total
  FROM intercompany_transactions
  WHERE eliminated = false
  GROUP BY enterprise_id
)
SELECT 
  tp.enterprise_id,
  e.name as enterprise_name,
  COUNT(DISTINCT tp.tenant_id) as company_count,
  SUM(tp.revenue) as total_revenue,
  SUM(tp.expenses) as total_expenses,
  SUM(tp.revenue) - SUM(tp.expenses) as net_profit,
  COALESCE(ic.intercompany_total, 0) as intercompany_to_eliminate,
  SUM(tp.revenue) - SUM(tp.expenses) - COALESCE(ic.intercompany_total, 0) as consolidated_profit
FROM tenant_pnl tp
JOIN enterprises e ON e.id = tp.enterprise_id
LEFT JOIN intercompany ic ON ic.enterprise_id = tp.enterprise_id
WHERE tp.enterprise_id IS NOT NULL
GROUP BY tp.enterprise_id, e.name, ic.intercompany_total;

-- Approval chains hierarchy
CREATE TABLE IF NOT EXISTS public.approval_chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  enterprise_id uuid REFERENCES public.enterprises(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('expense','budget','purchase','payroll')),
  amount_threshold numeric(14,2) NOT NULL,
  required_role text NOT NULL,
  approval_order int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, enterprise_id, entity_type, approval_order)
);

CREATE INDEX IF NOT EXISTS idx_approval_chains_tenant ON public.approval_chains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_chains_enterprise ON public.approval_chains(enterprise_id);

ALTER TABLE public.approval_chains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS approval_chains_tenant_all ON public.approval_chains;
CREATE POLICY approval_chains_tenant_all ON public.approval_chains
FOR ALL TO authenticated
USING (
  (tenant_id IS NULL AND enterprise_id IS NOT NULL AND EXISTS (SELECT 1 FROM enterprises en WHERE en.id = enterprise_id AND en.owner_user_id = auth.uid()))
  OR (tenant_id IS NOT NULL AND public.can_access_tenant(tenant_id))
)
WITH CHECK (
  (tenant_id IS NOT NULL AND public.can_access_tenant(tenant_id))
  OR (enterprise_id IS NOT NULL)
);

-- Vendors at Enterprise level (central procurement)
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid REFERENCES public.enterprises(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  contact_phone text,
  contact_email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vendor_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  enterprise_id uuid REFERENCES public.enterprises(id) ON DELETE CASCADE,
  title text NOT NULL,
  amount numeric(14,2),
  start_date date,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vendors_enterprise_all ON public.vendors;
CREATE POLICY vendors_enterprise_all ON public.vendors
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM enterprises en WHERE en.id = enterprise_id AND (en.owner_user_id = auth.uid() OR EXISTS (SELECT 1 FROM tenants t WHERE t.enterprise_id = en.id AND public.can_access_tenant(t.id))))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM enterprises en WHERE en.id = enterprise_id AND en.owner_user_id = auth.uid())
);

DROP POLICY IF EXISTS vendor_contracts_enterprise_all ON public.vendor_contracts;
CREATE POLICY vendor_contracts_enterprise_all ON public.vendor_contracts
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM enterprises en WHERE en.id = enterprise_id AND (en.owner_user_id = auth.uid() OR EXISTS (SELECT 1 FROM tenants t WHERE t.enterprise_id = en.id AND public.can_access_tenant(t.id))))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM enterprises en WHERE en.id = enterprise_id AND en.owner_user_id = auth.uid())
);

GRANT SELECT ON public.v_consolidated_pnl TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intercompany_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_chains TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_contracts TO authenticated;
