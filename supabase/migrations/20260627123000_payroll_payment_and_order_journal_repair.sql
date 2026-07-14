-- MJRH V2 — Payroll payment and order journal repair
-- Date: 2026-06-27
-- Fixes remaining audit issues after expense hardening:
-- 1) payroll_payment cash transactions must have payroll_payment journals.
-- 2) payroll expense_payment journals should not duplicate payroll_payment settlement.
-- 3) paid orders with missing order_payment journals are re-synced.

CREATE OR REPLACE FUNCTION public.sync_payroll_payment_journal(_payroll_line_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l record;
  tx record;
  cash_code text := '1000';
  je uuid;
BEGIN
  IF _payroll_line_id IS NULL THEN RETURN NULL; END IF;

  SELECT pl.*, e.full_name AS employee_name
  INTO l
  FROM public.payroll_lines pl
  LEFT JOIN public.employees e ON e.id = pl.employee_id
  WHERE pl.id = _payroll_line_id;

  IF l.id IS NULL THEN RETURN NULL; END IF;
  IF NOT public.can_manage_tenant_finance(l.tenant_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;

  SELECT ct.*, ca.account_type
  INTO tx
  FROM public.cash_transactions ct
  JOIN public.cash_accounts ca ON ca.id = ct.cash_account_id
  WHERE ct.tenant_id = l.tenant_id
    AND ct.source_type = 'payroll_payment'
    AND ct.source_id = l.id
    AND ct.status = 'posted'
  ORDER BY ct.happened_at DESC
  LIMIT 1;

  IF tx.id IS NULL THEN RETURN NULL; END IF;

  cash_code := CASE WHEN tx.account_type IN ('bank','wallet','instapay') THEN '1010' ELSE '1000' END;
  PERFORM public.ensure_default_chart_accounts_for(l.tenant_id);

  je := public.create_journal_entry_for_tenant(
    l.tenant_id,
    COALESCE(tx.happened_at, now())::date,
    COALESCE(tx.description, 'صرف راتب ' || COALESCE(l.employee_name, 'موظف')),
    'payroll_payment',
    l.id,
    jsonb_build_array(
      jsonb_build_object('account_code', '2100', 'debit', tx.amount, 'credit', 0, 'memo', 'إقفال رواتب مستحقة'),
      jsonb_build_object('account_code', cash_code, 'debit', 0, 'credit', tx.amount, 'memo', 'صرف راتب من الخزنة')
    )
  );

  UPDATE public.payroll_lines
  SET status = 'paid', cash_transaction_id = COALESCE(cash_transaction_id, tx.id), updated_at = now()
  WHERE id = l.id;

  RETURN je;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_payroll_payment_journal(uuid) TO authenticated;

-- Re-define expense sync to route payroll payments to payroll_payment, not expense_payment.
CREATE OR REPLACE FUNCTION public.sync_expense_financials(_expense_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e record;
  cash_id uuid;
  cash_code text := '1000';
  exp_code text := '5100';
  liab_code text := '2000';
  has_payable_journal boolean := false;
  has_payroll_cash_payment boolean := false;
BEGIN
  SELECT * INTO e FROM public.expenses WHERE id = _expense_id;
  IF e.id IS NULL THEN RETURN; END IF;
  IF NOT public.can_manage_tenant_finance(e.tenant_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;

  IF e.status = 'void' THEN
    UPDATE public.journal_entries
    SET status = 'void', updated_at = now()
    WHERE tenant_id = e.tenant_id
      AND source_id = e.id
      AND source_type IN ('expense_payable','expense_payment')
      AND status <> 'void';

    UPDATE public.cash_transactions
    SET status = 'void'
    WHERE tenant_id = e.tenant_id
      AND source_type IN ('expense_payment','expense')
      AND source_id = e.id
      AND status <> 'void';
    RETURN;
  END IF;

  PERFORM public.ensure_default_chart_accounts_for(e.tenant_id);

  IF e.category = 'salaries' THEN
    exp_code := '5000';
    liab_code := '2100';
  ELSIF e.category IN ('rent','water','electricity') THEN
    exp_code := '5200';
  ELSIF e.category IN ('supplies','inventory','stock') THEN
    exp_code := '5300';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.journal_entries
    WHERE tenant_id = e.tenant_id
      AND source_type = 'expense_payable'
      AND source_id = e.id
      AND status <> 'void'
  ) INTO has_payable_journal;

  SELECT EXISTS (
    SELECT 1
    FROM public.cash_transactions ct
    WHERE ct.tenant_id = e.tenant_id
      AND ct.source_type = 'payroll_payment'
      AND ct.source_id = e.source_id
      AND ct.status = 'posted'
  ) INTO has_payroll_cash_payment;

  IF e.status = 'payable' THEN
    PERFORM public.create_journal_entry_for_tenant(e.tenant_id, COALESCE(e.spent_at, now())::date, COALESCE(e.description,'مصروف مستحق'), 'expense_payable', e.id,
      jsonb_build_array(
        jsonb_build_object('account_code', exp_code, 'debit', e.amount, 'credit', 0, 'memo', 'إثبات المصروف المستحق'),
        jsonb_build_object('account_code', liab_code, 'debit', 0, 'credit', e.amount, 'memo', 'مصروف مستحق / آجل')
      )
    );

    UPDATE public.journal_entries
    SET status = 'void', updated_at = now()
    WHERE tenant_id = e.tenant_id
      AND source_type = 'expense_payment'
      AND source_id = e.id
      AND status <> 'void';
    UPDATE public.cash_transactions
    SET status = 'void'
    WHERE tenant_id = e.tenant_id
      AND source_type = 'expense_payment'
      AND source_id = e.id
      AND status <> 'void';
    RETURN;
  END IF;

  IF e.status = 'paid' AND has_payroll_cash_payment THEN
    -- Payroll payment is represented by source_type='payroll_payment' on payroll_lines.
    -- Keep/payroll accrual as expense_payable, create payroll_payment settlement, and void duplicate expense_payment.
    PERFORM public.create_journal_entry_for_tenant(e.tenant_id, COALESCE(e.spent_at, now())::date, COALESCE(e.description,'راتب مستحق'), 'expense_payable', e.id,
      jsonb_build_array(
        jsonb_build_object('account_code', exp_code, 'debit', e.amount, 'credit', 0, 'memo', 'إثبات راتب مستحق'),
        jsonb_build_object('account_code', liab_code, 'debit', 0, 'credit', e.amount, 'memo', 'رواتب مستحقة')
      )
    );

    PERFORM public.sync_payroll_payment_journal(e.source_id);

    UPDATE public.journal_entries
    SET status = 'void', updated_at = now()
    WHERE tenant_id = e.tenant_id
      AND source_type = 'expense_payment'
      AND source_id = e.id
      AND status <> 'void';

    UPDATE public.cash_transactions
    SET status = 'void'
    WHERE tenant_id = e.tenant_id
      AND source_type = 'expense_payment'
      AND source_id = e.id
      AND status <> 'void';
    RETURN;
  END IF;

  IF e.status = 'paid' THEN
    cash_id := public.pick_cash_account_for_expense(e.tenant_id, e.branch_id, e.cash_account_id);
    IF cash_id IS NULL THEN RAISE EXCEPTION 'No cash account for paid expense'; END IF;

    SELECT CASE WHEN account_type IN ('bank','wallet','instapay') THEN '1010' ELSE '1000' END
    INTO cash_code
    FROM public.cash_accounts
    WHERE id = cash_id;

    IF e.cash_account_id IS DISTINCT FROM cash_id THEN
      UPDATE public.expenses SET cash_account_id = cash_id WHERE id = e.id;
    END IF;

    IF has_payable_journal THEN
      PERFORM public.create_journal_entry_for_tenant(e.tenant_id, COALESCE(e.spent_at, now())::date, COALESCE(e.description,'مصروف مستحق'), 'expense_payable', e.id,
        jsonb_build_array(
          jsonb_build_object('account_code', exp_code, 'debit', e.amount, 'credit', 0, 'memo', 'إثبات المصروف المستحق'),
          jsonb_build_object('account_code', liab_code, 'debit', 0, 'credit', e.amount, 'memo', 'مصروف مستحق / آجل')
        )
      );

      PERFORM public.create_journal_entry_for_tenant(e.tenant_id, COALESCE(e.paid_at, e.spent_at, now())::date, 'سداد ' || COALESCE(e.description,'مصروف مستحق'), 'expense_payment', e.id,
        jsonb_build_array(
          jsonb_build_object('account_code', liab_code, 'debit', e.amount, 'credit', 0, 'memo', 'إقفال المصروف المستحق'),
          jsonb_build_object('account_code', cash_code, 'debit', 0, 'credit', e.amount, 'memo', 'صرف من الخزنة')
        )
      );
    ELSE
      PERFORM public.create_journal_entry_for_tenant(e.tenant_id, COALESCE(e.spent_at, now())::date, COALESCE(e.description,'مصروف مدفوع'), 'expense_payment', e.id,
        jsonb_build_array(
          jsonb_build_object('account_code', exp_code, 'debit', e.amount, 'credit', 0, 'memo', 'مصروف مدفوع مباشرة'),
          jsonb_build_object('account_code', cash_code, 'debit', 0, 'credit', e.amount, 'memo', 'صرف من الخزنة')
        )
      );
    END IF;

    INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at, created_by)
    VALUES (e.tenant_id, cash_id, 'out', e.amount, 'expense_payment', e.id, COALESCE(e.description,'مصروف'), COALESCE(e.paid_at, e.spent_at, now()), e.created_by)
    ON CONFLICT (tenant_id, source_type, source_id, direction)
      WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void'
    DO UPDATE SET
      cash_account_id = EXCLUDED.cash_account_id,
      amount = EXCLUDED.amount,
      description = EXCLUDED.description,
      happened_at = EXCLUDED.happened_at,
      status = 'posted';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_expense_financials(uuid) TO authenticated;

-- Backfill payroll payment journals and void duplicate payroll expense_payment settlements.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT distinct ct.source_id AS payroll_line_id
    FROM public.cash_transactions ct
    WHERE ct.source_type = 'payroll_payment'
      AND ct.status = 'posted'
      AND ct.source_id IS NOT NULL
  LOOP
    BEGIN
      PERFORM public.sync_payroll_payment_journal(r.payroll_line_id);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

UPDATE public.journal_entries je
SET status = 'void', updated_at = now()
FROM public.expenses e
WHERE je.source_type = 'expense_payment'
  AND je.source_id = e.id
  AND je.status <> 'void'
  AND e.source_type IN ('payroll_line','auto_payroll_line')
  AND EXISTS (
    SELECT 1 FROM public.cash_transactions ct
    WHERE ct.tenant_id = e.tenant_id
      AND ct.source_type = 'payroll_payment'
      AND ct.source_id = e.source_id
      AND ct.status = 'posted'
  );

-- Re-sync paid orders that still miss payment journals/cash links.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT o.id
    FROM public.orders o
    WHERE o.payment_status = 'paid'
      AND o.status <> 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM public.journal_entries je
        WHERE je.tenant_id = o.tenant_id
          AND je.source_type = 'order_payment'
          AND je.source_id = o.id
          AND je.status <> 'void'
      )
  LOOP
    BEGIN
      PERFORM public.sync_order_financials(r.id);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

UPDATE public.cash_accounts ca
SET current_balance = public.cash_account_expected_balance(ca.id), updated_at = now();
