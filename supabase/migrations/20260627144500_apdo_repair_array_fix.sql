-- MJRH V2 — APDO repair function array fix
-- Date: 2026-06-27
-- Fixes PostgreSQL array append bug in repair_operation_event_apdo.

CREATE OR REPLACE FUNCTION public.repair_operation_event_apdo(_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e record;
  bid uuid;
  cash_id uuid;
  jid uuid;
  nid uuid;
  href text;
  fixed text[] := ARRAY[]::text[];
  transfer_id uuid;
  order_id uuid;
  expense_id uuid;
BEGIN
  SELECT * INTO e FROM public.operation_events WHERE id = _event_id;
  IF e.id IS NULL THEN RAISE EXCEPTION 'عملية APDO غير موجودة'; END IF;
  IF NOT (public.is_privileged_context() OR public.is_tenant_manager(auth.uid(), e.tenant_id) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  bid := e.branch_id;
  cash_id := e.cash_account_id;
  jid := e.journal_entry_id;
  nid := e.notification_id;
  href := public.apdo_event_href(e.source_type, e.source_id, e.data);

  -- Infer branch from source.
  IF bid IS NULL THEN
    IF e.source_type = 'order' AND e.source_id IS NOT NULL THEN
      SELECT branch_id INTO bid FROM public.orders WHERE id = e.source_id;
    ELSIF e.source_type = 'service_unit' AND e.source_id IS NOT NULL THEN
      SELECT o.branch_id INTO bid FROM public.service_units su JOIN public.orders o ON o.id = su.order_id WHERE su.id = e.source_id;
    ELSIF e.source_type = 'expense' AND e.source_id IS NOT NULL THEN
      SELECT branch_id INTO bid FROM public.expenses WHERE id = e.source_id;
    ELSIF e.source_type IN ('payroll_line','payroll_payment') AND e.source_id IS NOT NULL THEN
      SELECT emp.branch_id INTO bid FROM public.payroll_lines pl LEFT JOIN public.employees emp ON emp.id = pl.employee_id WHERE pl.id = e.source_id;
    ELSIF e.source_type IN ('manual_cash_transaction','cash_transaction') AND e.source_id IS NOT NULL THEN
      SELECT ca.branch_id INTO bid FROM public.cash_transactions ct JOIN public.cash_accounts ca ON ca.id = ct.cash_account_id WHERE ct.id = e.source_id;
    ELSIF e.source_type = 'cash_transfer' THEN
      SELECT ca.branch_id INTO bid
      FROM public.cash_transactions ct
      JOIN public.cash_accounts ca ON ca.id = ct.cash_account_id
      WHERE ct.tenant_id = e.tenant_id
        AND ct.source_type = 'cash_transfer'
        AND (
          (e.source_id IS NOT NULL AND ct.source_id = e.source_id)
          OR (e.data->>'from_cash_account_id' IS NOT NULL AND ct.cash_account_id = (e.data->>'from_cash_account_id')::uuid)
        )
      ORDER BY ABS(EXTRACT(EPOCH FROM (ct.created_at - e.created_at)))
      LIMIT 1;
    END IF;

    IF bid IS NULL THEN bid := public.default_branch_id_for(e.tenant_id); END IF;
    IF bid IS NOT NULL THEN fixed := array_append(fixed, 'branch'); END IF;
  END IF;

  -- Infer/link cash account if cash is expected.
  IF cash_id IS NULL AND COALESCE((e.output->>'cash_impact')::boolean, false) THEN
    IF e.source_type = 'order' AND e.source_id IS NOT NULL THEN
      SELECT cash_account_id INTO cash_id FROM public.cash_transactions WHERE tenant_id = e.tenant_id AND source_type IN ('order_payment','driver_tip') AND source_id = e.source_id AND status = 'posted' ORDER BY created_at DESC LIMIT 1;
    ELSIF e.source_type = 'expense' AND e.source_id IS NOT NULL THEN
      SELECT cash_account_id INTO cash_id FROM public.expenses WHERE id = e.source_id;
    ELSIF e.source_type IN ('payroll_line','payroll_payment') AND e.source_id IS NOT NULL THEN
      SELECT cash_account_id INTO cash_id FROM public.cash_transactions WHERE tenant_id = e.tenant_id AND source_type = 'payroll_payment' AND source_id = e.source_id AND status = 'posted' ORDER BY created_at DESC LIMIT 1;
    ELSIF e.source_type = 'manual_cash_transaction' AND e.source_id IS NOT NULL THEN
      SELECT cash_account_id INTO cash_id FROM public.cash_transactions WHERE id = e.source_id;
    ELSIF e.source_type = 'cash_transfer' THEN
      SELECT cash_account_id, source_id INTO cash_id, transfer_id
      FROM public.cash_transactions
      WHERE tenant_id = e.tenant_id
        AND source_type = 'cash_transfer'
        AND direction = 'out'
        AND (
          (e.source_id IS NOT NULL AND source_id = e.source_id)
          OR (e.data->>'from_cash_account_id' IS NOT NULL AND cash_account_id = (e.data->>'from_cash_account_id')::uuid)
        )
      ORDER BY ABS(EXTRACT(EPOCH FROM (created_at - e.created_at)))
      LIMIT 1;
      IF e.source_id IS NULL AND transfer_id IS NOT NULL THEN
        UPDATE public.operation_events SET source_id = transfer_id WHERE id = e.id;
        e.source_id := transfer_id;
      END IF;
    END IF;

    IF cash_id IS NULL THEN cash_id := public.pick_cash_account_for_expense(e.tenant_id, bid, NULL); END IF;
    IF cash_id IS NOT NULL THEN fixed := array_append(fixed, 'cash'); END IF;
  END IF;

  -- Run source-specific accounting sync if a journal is expected.
  IF COALESCE((e.output->>'journal_required')::boolean, false) THEN
    BEGIN
      IF e.source_type = 'order' AND e.source_id IS NOT NULL THEN
        PERFORM public.sync_order_financials(e.source_id);
      ELSIF e.source_type = 'expense' AND e.source_id IS NOT NULL THEN
        PERFORM public.sync_expense_financials(e.source_id);
      ELSIF e.source_type IN ('payroll_line','payroll_payment') AND e.source_id IS NOT NULL THEN
        PERFORM public.sync_payroll_payment_journal(e.source_id);
      ELSIF e.source_type = 'manual_cash_transaction' AND e.source_id IS NOT NULL THEN
        PERFORM public.sync_manual_cash_transaction_journal(e.source_id);
      ELSIF e.source_type = 'employee_advance' AND e.source_id IS NOT NULL THEN
        SELECT id INTO expense_id FROM public.expenses WHERE tenant_id = e.tenant_id AND source_type = 'employee_advance' AND source_id = e.source_id LIMIT 1;
        IF expense_id IS NOT NULL THEN PERFORM public.sync_expense_financials(expense_id); END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Keep repair best-effort; details remain visible in APDO.
      NULL;
    END;
  END IF;

  -- Link a journal that may use a business source_type different from APDO source_type.
  IF jid IS NULL AND COALESCE((e.output->>'journal_required')::boolean, false) THEN
    IF e.source_type = 'order' AND e.source_id IS NOT NULL THEN
      SELECT id INTO jid FROM public.journal_entries WHERE tenant_id = e.tenant_id AND source_id = e.source_id AND source_type IN ('order_payment','order_receivable','driver_tip') AND status <> 'void' ORDER BY created_at DESC LIMIT 1;
    ELSIF e.source_type = 'expense' AND e.source_id IS NOT NULL THEN
      SELECT id INTO jid FROM public.journal_entries WHERE tenant_id = e.tenant_id AND source_id = e.source_id AND source_type IN ('expense_payment','expense_payable') AND status <> 'void' ORDER BY created_at DESC LIMIT 1;
    ELSIF e.source_type = 'payroll_line' AND e.source_id IS NOT NULL THEN
      SELECT je.id INTO jid
      FROM public.payroll_lines pl
      JOIN public.expenses ex ON ex.id = pl.expense_id
      JOIN public.journal_entries je ON je.source_id = ex.id AND je.source_type = 'expense_payable' AND je.status <> 'void'
      WHERE pl.id = e.source_id
      ORDER BY je.created_at DESC LIMIT 1;
    ELSIF e.source_type = 'payroll_payment' AND e.source_id IS NOT NULL THEN
      SELECT id INTO jid FROM public.journal_entries WHERE tenant_id = e.tenant_id AND source_id = e.source_id AND source_type = 'payroll_payment' AND status <> 'void' ORDER BY created_at DESC LIMIT 1;
    ELSIF e.source_type = 'employee_advance' AND e.source_id IS NOT NULL THEN
      SELECT je.id INTO jid
      FROM public.expenses ex
      JOIN public.journal_entries je ON je.source_id = ex.id AND je.source_type IN ('expense_payment','expense_payable') AND je.status <> 'void'
      WHERE ex.tenant_id = e.tenant_id AND ex.source_type = 'employee_advance' AND ex.source_id = e.source_id
      ORDER BY je.created_at DESC LIMIT 1;
    ELSIF e.source_type = 'manual_cash_transaction' AND e.source_id IS NOT NULL THEN
      SELECT id INTO jid FROM public.journal_entries WHERE tenant_id = e.tenant_id AND source_id = e.source_id AND source_type = 'manual_cash_transaction' AND status <> 'void' ORDER BY created_at DESC LIMIT 1;
    ELSIF e.source_type = 'cash_transfer' AND e.source_id IS NOT NULL THEN
      SELECT id INTO jid FROM public.journal_entries WHERE tenant_id = e.tenant_id AND source_id = e.source_id AND source_type = 'cash_transfer' AND status <> 'void' ORDER BY created_at DESC LIMIT 1;
    END IF;
    IF jid IS NOT NULL THEN fixed := array_append(fixed, 'journal'); END IF;
  END IF;

  -- Create or link missing internal notification when required and no external/customer notification was prepared.
  IF e.requires_notification AND nid IS NULL AND NOT COALESCE((e.output->>'notification_prepared')::boolean, false) THEN
    INSERT INTO public.app_notifications(tenant_id, branch_id, audience, title, body, href, tone)
    VALUES (
      e.tenant_id,
      bid,
      'owner',
      e.process_name,
      COALESCE(e.data->>'reason', e.data->>'message', e.data->>'order_number', 'عملية تحتاج متابعة'),
      href,
      CASE WHEN COALESCE((e.output->>'journal_required')::boolean, false) OR COALESCE((e.output->>'cash_impact')::boolean, false) THEN 'warning' ELSE 'info' END
    ) RETURNING id INTO nid;
    fixed := array_append(fixed, 'notification');
  END IF;

  UPDATE public.operation_events
  SET branch_id = COALESCE(bid, branch_id),
      cash_account_id = COALESCE(cash_id, cash_account_id),
      journal_entry_id = COALESCE(jid, journal_entry_id),
      notification_id = COALESCE(nid, notification_id),
      notification_created = COALESCE(nid, notification_id) IS NOT NULL OR COALESCE((output->>'notification_prepared')::boolean, false),
      report_bucket = COALESCE(NULLIF(report_bucket, ''), 'system/apdo')
  WHERE id = e.id;

  RETURN jsonb_build_object('ok', true, 'fixed', fixed, 'href', href);
END;
$$;
GRANT EXECUTE ON FUNCTION public.repair_operation_event_apdo(uuid) TO authenticated;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT id
    FROM public.operation_answer_matrix
    WHERE branch_answer <> 'answered'
       OR cash_answer = 'missing_cash_account'
       OR journal_answer = 'missing_journal'
       OR report_answer <> 'answered'
       OR notification_answer = 'missing_notification'
  LOOP
    BEGIN
      PERFORM public.repair_operation_event_apdo(r.id);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;
