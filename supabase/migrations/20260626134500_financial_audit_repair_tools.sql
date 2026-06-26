-- Repair helpers for operational readiness. Safe best-effort repairs for common audit issues.

CREATE OR REPLACE FUNCTION public.repair_financial_operation_audit(_tenant_id uuid DEFAULT public.current_tenant_id(), _max_items integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  fixed_count integer := 0;
  err_count integer := 0;
  bid uuid;
  cash_id uuid;
  msg text;
BEGIN
  IF _tenant_id IS NULL THEN
    RETURN jsonb_build_object('fixed', 0, 'errors', 1, 'message', 'No tenant');
  END IF;

  PERFORM public.ensure_default_branch_for(_tenant_id, NULL);
  PERFORM public.ensure_default_cash_account_for(_tenant_id);
  PERFORM public.ensure_default_chart_accounts_for(_tenant_id);

  FOR r IN
    SELECT * FROM public.financial_operation_audit
    WHERE tenant_id = _tenant_id
    ORDER BY CASE WHEN severity = 'danger' THEN 0 ELSE 1 END, created_at DESC
    LIMIT GREATEST(1, COALESCE(_max_items, 100))
  LOOP
    BEGIN
      IF r.issue_key = 'order_missing_branch' THEN
        bid := public.default_branch_id_for(_tenant_id);
        UPDATE public.orders SET branch_id = bid WHERE id = r.source_id AND branch_id IS NULL;
        fixed_count := fixed_count + 1;

      ELSIF r.issue_key = 'cash_account_missing_branch' THEN
        bid := public.default_branch_id_for(_tenant_id);
        UPDATE public.cash_accounts SET branch_id = bid WHERE id = r.source_id AND branch_id IS NULL;
        fixed_count := fixed_count + 1;

      ELSIF r.issue_key = 'inventory_item_missing_branch' THEN
        bid := public.default_branch_id_for(_tenant_id);
        UPDATE public.inventory_items SET branch_id = bid WHERE id = r.source_id AND branch_id IS NULL;
        UPDATE public.inventory_movements SET branch_id = bid WHERE item_id = r.source_id AND branch_id IS NULL;
        fixed_count := fixed_count + 1;

      ELSIF r.source_type = 'order' AND r.issue_key IN ('paid_order_missing_cash_tx','paid_order_missing_journal','receivable_order_missing_journal') THEN
        PERFORM public.sync_order_financials(r.source_id);
        fixed_count := fixed_count + 1;

      ELSIF r.source_type = 'expense' AND r.issue_key IN ('paid_expense_missing_cash_account','paid_expense_missing_journal','payable_expense_missing_journal') THEN
        SELECT COALESCE(e.branch_id, public.default_branch_id_for(e.tenant_id)) INTO bid FROM public.expenses e WHERE e.id = r.source_id;
        SELECT id INTO cash_id FROM public.cash_accounts WHERE tenant_id = _tenant_id AND is_active = true AND (branch_id = bid OR bid IS NULL) ORDER BY created_at LIMIT 1;
        IF cash_id IS NULL THEN cash_id := public.ensure_default_cash_account_for(_tenant_id); END IF;
        UPDATE public.expenses SET branch_id = COALESCE(branch_id, bid), cash_account_id = CASE WHEN status = 'paid' THEN COALESCE(cash_account_id, cash_id) ELSE cash_account_id END WHERE id = r.source_id;
        PERFORM public.sync_expense_financials(r.source_id);
        fixed_count := fixed_count + 1;

      ELSIF r.issue_key = 'cash_tx_missing_journal' THEN
        PERFORM public.sync_manual_cash_transactions_journals();
        fixed_count := fixed_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      err_count := err_count + 1;
    END;
  END LOOP;

  PERFORM public.repair_cash_account_balances();

  SELECT count(*)::text INTO msg FROM public.financial_operation_audit WHERE tenant_id = _tenant_id;
  RETURN jsonb_build_object('fixed', fixed_count, 'errors', err_count, 'remaining', msg::integer);
END;
$$;
GRANT EXECUTE ON FUNCTION public.repair_financial_operation_audit(uuid,integer) TO authenticated;
