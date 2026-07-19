-- MJRH v3.3 — Tasks A + D — Accounting integration for work_orders + snapshot protection + cleanup

-- ============================================================================
-- ADR Decision: work_orders vs orders — documented
-- ============================================================================
-- Decision: Keep work_orders separate from orders permanently (not merge)
-- Rationale:
-- - orders table is legacy laundry-specific with strong coupling to service_units, garment logic, cleaning_done etc.
-- - work_orders is generic, supports any industry, has workflow_version_snapshot for immutability
-- - Merging would require risky data migration and break v1 tenants
-- - Long-term: v1 tenants stay on orders, new tenants (v2) use work_orders only. When v1 retires (12+ months), orders can be archived
-- - Accounting can be unified via journal_entries source_type = 'order' vs 'work_order'
-- This decision is recorded in docs/ADR_WORK_ORDERS_SEPARATION.md (to be created)
-- ============================================================================

-- Add is_financial_trigger to workflow_stages_v2
ALTER TABLE public.workflow_stages_v2
  ADD COLUMN IF NOT EXISTS is_financial_trigger boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.workflow_stages_v2.is_financial_trigger IS 'If true, completing this stage triggers accounting journal (payment/delivery) — e.g., delivery stage';

-- Add total and payment fields to work_orders for accounting
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS total_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','partial')),
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- Add work_order_id to journal_entries for explicit linking (nullable, to keep orders working)
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_journal_entries_work_order ON public.journal_entries(work_order_id) WHERE work_order_id IS NOT NULL;

-- Add work_order_id to cash_transactions
ALTER TABLE public.cash_transactions
  ADD COLUMN IF NOT EXISTS work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cash_transactions_work_order ON public.cash_transactions(work_order_id) WHERE work_order_id IS NOT NULL;

-- Add work_order_id to customer_financial_ledger
ALTER TABLE public.customer_financial_ledger
  ADD COLUMN IF NOT EXISTS work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customer_ledger_work_order ON public.customer_financial_ledger(work_order_id) WHERE work_order_id IS NOT NULL;

-- ============================================================================
-- Task D: Ensure workflow_version_snapshot is actually filled and immutable
-- ============================================================================

-- The column already exists from previous migration, but ensure trigger exists and snapshot is not overwritten on update
CREATE OR REPLACE FUNCTION public.fill_work_order_snapshot()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  snap jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.workflow_version_snapshot IS NULL OR NEW.workflow_version_snapshot = '{}'::jsonb THEN
      NEW.workflow_version_snapshot := public.create_workflow_snapshot(NEW.workflow_id);
    END IF;

    -- Set initial stage if not provided
    IF NEW.current_stage_id IS NULL THEN
      SELECT id INTO NEW.current_stage_id 
      FROM workflow_stages_v2 
      WHERE workflow_id = NEW.workflow_id AND is_initial = true 
      ORDER BY stage_order LIMIT 1;
    END IF;

    -- Set SLA due based on current stage target
    IF NEW.sla_due_at IS NULL AND NEW.current_stage_id IS NOT NULL THEN
      SELECT now() + (sla_target_mins || ' minutes')::interval INTO NEW.sla_due_at
      FROM workflow_stages_v2 WHERE id = NEW.current_stage_id;
    END IF;
  ELSE
    -- On UPDATE, never overwrite snapshot (protect open orders from breaking when definition changes)
    NEW.workflow_version_snapshot := OLD.workflow_version_snapshot;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_work_order_snapshot ON public.work_orders;
CREATE TRIGGER trg_fill_work_order_snapshot
BEFORE INSERT OR UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.fill_work_order_snapshot();

-- ============================================================================
-- Task A: Accounting trigger for work_orders — generalized version of sync_order_financials
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_work_order_financials(_work_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  wo record;
  stage record;
  amount numeric;
  cash_id uuid;
  is_financial boolean;
BEGIN
  SELECT * INTO wo FROM public.work_orders WHERE id = _work_order_id;
  IF wo.id IS NULL THEN RETURN; END IF;
  IF wo.status = 'cancelled' THEN RETURN; END IF;

  -- Get current stage to check if it's financial trigger
  SELECT * INTO stage FROM public.workflow_stages_v2 WHERE id = wo.current_stage_id;
  is_financial := COALESCE(stage.is_financial_trigger, false) OR wo.status = 'completed' OR wo.payment_status = 'paid';

  IF NOT is_financial THEN RETURN; END IF;

  amount := COALESCE(wo.total_amount, 0);
  IF amount <= 0 THEN RETURN; END IF;

  PERFORM public.ensure_default_chart_accounts_for(wo.tenant_id);
  cash_id := public.ensure_default_cash_account_for(wo.tenant_id);

  -- Customer ledger - invoice
  IF wo.customer_id IS NOT NULL THEN
    INSERT INTO public.customer_financial_ledger(tenant_id, customer_id, work_order_id, entry_type, amount, direction, source_type, source_id, description, entry_at)
    VALUES (wo.tenant_id, wo.customer_id, wo.id, 'invoice', amount, 'customer_owes', 'work_order_invoice', wo.id, 'فاتورة عمل #' || COALESCE(wo.title, ''), wo.created_at)
    ON CONFLICT (tenant_id, customer_id, entry_type, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;
  END IF;

  IF wo.payment_status = 'paid' THEN
    -- Payment ledger
    IF wo.customer_id IS NOT NULL THEN
      INSERT INTO public.customer_financial_ledger(tenant_id, customer_id, work_order_id, entry_type, amount, direction, source_type, source_id, description, entry_at)
      VALUES (wo.tenant_id, wo.customer_id, wo.id, 'payment', amount, 'customer_paid', 'work_order_payment', wo.id, 'سداد عمل #' || COALESCE(wo.title, ''), now())
      ON CONFLICT (tenant_id, customer_id, entry_type, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;
    END IF;

    -- Cash in
    INSERT INTO public.cash_transactions(tenant_id, cash_account_id, work_order_id, direction, amount, source_type, source_id, description, happened_at)
    VALUES (wo.tenant_id, cash_id, wo.id, 'in', amount, 'work_order_payment', wo.id, 'تحصيل عمل #' || COALESCE(wo.title, ''), now())
    ON CONFLICT (tenant_id, source_type, source_id, direction) WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void' DO NOTHING;

    -- Journal entry
    PERFORM public.create_journal_entry_for_tenant(wo.tenant_id, CURRENT_DATE, 'تحصيل إيراد عمل #' || COALESCE(wo.title, ''), 'work_order_payment', wo.id,
      jsonb_build_array(
        jsonb_build_object('account_code','1000','debit',amount,'credit',0,'memo','تحصيل نقدي عمل عام'),
        jsonb_build_object('account_code','4000','debit',0,'credit',amount,'memo','إيراد خدمات عام')
      )
    );

    -- Also set work_order_id in journal_entries for explicit link
    UPDATE public.journal_entries SET work_order_id = wo.id WHERE source_type = 'work_order_payment' AND source_id = wo.id AND work_order_id IS NULL;
  ELSE
    -- Receivable
    PERFORM public.create_journal_entry_for_tenant(wo.tenant_id, wo.created_at::date, 'إثبات ذمة عمل #' || COALESCE(wo.title, ''), 'work_order_receivable', wo.id,
      jsonb_build_array(
        jsonb_build_object('account_code','1100','debit',amount,'credit',0,'memo','ذمم عملاء عمل عام'),
        jsonb_build_object('account_code','4000','debit',0,'credit',amount,'memo','إيراد خدمات آجل عام')
      )
    );
    UPDATE public.journal_entries SET work_order_id = wo.id WHERE source_type = 'work_order_receivable' AND source_id = wo.id AND work_order_id IS NULL;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_work_order_financials(uuid) TO authenticated;

-- Trigger on work_orders status/payment change
CREATE OR REPLACE FUNCTION public.trg_sync_work_order_financials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only trigger if stage is financial or status changed to completed/paid
  PERFORM public.sync_work_order_financials(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_work_orders_financial_sync ON public.work_orders;
CREATE TRIGGER trg_work_orders_financial_sync
AFTER INSERT OR UPDATE OF status, payment_status, current_stage_id, total_amount ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_work_order_financials();

-- Also trigger when stage marked as financial_trigger
CREATE OR REPLACE FUNCTION public.trg_workflow_stage_financial_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  wo_id uuid;
BEGIN
  IF NEW.is_financial_trigger = true THEN
    FOR wo_id IN SELECT id FROM work_orders WHERE current_stage_id = NEW.id LOOP
      PERFORM public.sync_work_order_financials(wo_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stage_financial_check ON public.workflow_stages_v2;
CREATE TRIGGER trg_stage_financial_check
AFTER UPDATE OF is_financial_trigger ON public.workflow_stages_v2
FOR EACH ROW EXECUTE FUNCTION public.trg_workflow_stage_financial_check();

-- ============================================================================
-- Task C: Clean duplication — ensure only one canonical legacy file
-- This migration doesn't delete files, but documents decision
-- Actual file deletion happens in code repo (see docs)
-- ============================================================================

-- No DB changes for Task C, just documentation

-- ============================================================================
-- RLS: Ensure new columns/tables use can_access_tenant exactly like rest
-- ============================================================================

-- work_orders already has RLS using can_access_tenant + can_access_branch — verified
-- workflow_stages_v2, workflow_transitions, workflow_definitions already use can_access_tenant — verified in previous migration

-- For new audit table, ensure it uses can_access_tenant (already done)

-- ============================================================================
-- Seed: Mark final stages as financial triggers for existing templates
-- ============================================================================

UPDATE public.workflow_stages_v2
SET is_financial_trigger = true
WHERE is_final = true;

-- For hospitality template, mark ready stage as financial
UPDATE public.workflow_stages_v2
SET is_financial_trigger = true
WHERE slug IN ('ready','delivery','completed') AND workflow_id IN (
  SELECT id FROM workflow_definitions WHERE industry IN ('hospitality','food_chain','generic')
);

-- ============================================================================
-- Test helper view for P&L real numbers from v2
-- ============================================================================

CREATE OR REPLACE VIEW public.v_work_orders_pnl
WITH (security_invoker = true)
AS
SELECT 
  wo.tenant_id,
  COUNT(*) as total_work_orders,
  COUNT(*) FILTER (WHERE wo.status = 'completed') as completed_orders,
  COUNT(*) FILTER (WHERE wo.payment_status = 'paid') as paid_orders,
  COALESCE(SUM(wo.total_amount), 0) as total_amount,
  COALESCE(SUM(wo.total_amount) FILTER (WHERE wo.payment_status = 'paid'), 0) as paid_amount,
  COALESCE(SUM(wo.total_amount) FILTER (WHERE wo.status = 'completed'), 0) as completed_amount
FROM work_orders wo
GROUP BY wo.tenant_id;

GRANT SELECT ON public.v_work_orders_pnl TO authenticated;
