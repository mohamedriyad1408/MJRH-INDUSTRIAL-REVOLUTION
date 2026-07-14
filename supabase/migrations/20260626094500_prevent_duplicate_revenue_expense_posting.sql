-- Prevent duplicated revenue/expense caused by monthly aggregate journals and paying already-accrued expenses.

-- 1) Expense sync: expense is recognized once. If a payable journal already exists, payment only clears the liability.
CREATE OR REPLACE FUNCTION public.sync_expense_financials(_expense_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e record;
  cash_id uuid;
  exp_code text := '5100';
  liab_code text := '2000';
  has_payable_journal boolean := false;
BEGIN
  SELECT * INTO e FROM public.expenses WHERE id = _expense_id;
  IF e.id IS NULL THEN RETURN; END IF;

  IF e.status = 'void' THEN
    UPDATE public.journal_entries
    SET status = 'void', updated_at = now()
    WHERE tenant_id = e.tenant_id
      AND source_id = e.id
      AND source_type IN ('expense_payable','expense_payment')
      AND status <> 'void';
    RETURN;
  END IF;

  PERFORM public.ensure_default_chart_accounts_for(e.tenant_id);
  cash_id := public.ensure_default_cash_account_for(e.tenant_id);

  IF e.category = 'salaries' THEN
    exp_code := '5000';
    liab_code := '2100';
  ELSIF e.category IN ('rent','water','electricity') THEN
    exp_code := '5200';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.journal_entries
    WHERE tenant_id = e.tenant_id
      AND source_type = 'expense_payable'
      AND source_id = e.id
      AND status <> 'void'
  ) INTO has_payable_journal;

  IF e.status = 'payable' THEN
    PERFORM public.create_journal_entry_for_tenant(e.tenant_id, COALESCE(e.spent_at, now())::date, COALESCE(e.description,'مصروف مستحق'), 'expense_payable', e.id,
      jsonb_build_array(
        jsonb_build_object('account_code', exp_code, 'debit', e.amount, 'credit', 0, 'memo', 'إثبات المصروف مرة واحدة'),
        jsonb_build_object('account_code', liab_code, 'debit', 0, 'credit', e.amount, 'memo', 'مصروف مستحق / آجل')
      )
    );

    UPDATE public.journal_entries
    SET status = 'void', updated_at = now()
    WHERE tenant_id = e.tenant_id
      AND source_type = 'expense_payment'
      AND source_id = e.id
      AND status <> 'void';
    RETURN;
  END IF;

  IF e.status = 'paid' THEN
    INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at)
    VALUES (e.tenant_id, cash_id, 'out', e.amount, 'expense_payment', e.id, COALESCE(e.description,'مصروف'), COALESCE(e.paid_at, e.spent_at, now()))
    ON CONFLICT (tenant_id, source_type, source_id, direction)
      WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void'
    DO NOTHING;

    IF has_payable_journal THEN
      -- Payment of an already-accrued payable: Dr liability, Cr cash. Do NOT debit expense again.
      PERFORM public.create_journal_entry_for_tenant(e.tenant_id, COALESCE(e.paid_at, e.spent_at, now())::date, 'سداد ' || COALESCE(e.description,'مصروف مستحق'), 'expense_payment', e.id,
        jsonb_build_array(
          jsonb_build_object('account_code', liab_code, 'debit', e.amount, 'credit', 0, 'memo', 'إقفال المصروف المستحق'),
          jsonb_build_object('account_code', '1000', 'debit', 0, 'credit', e.amount, 'memo', 'صرف من الخزنة')
        )
      );
    ELSE
      -- Direct paid expense: recognize expense and cash in the same entry.
      PERFORM public.create_journal_entry_for_tenant(e.tenant_id, COALESCE(e.spent_at, now())::date, COALESCE(e.description,'مصروف مدفوع'), 'expense_payment', e.id,
        jsonb_build_array(
          jsonb_build_object('account_code', exp_code, 'debit', e.amount, 'credit', 0, 'memo', 'مصروف مدفوع مباشرة'),
          jsonb_build_object('account_code', '1000', 'debit', 0, 'credit', e.amount, 'memo', 'صرف من الخزنة')
        )
      );
    END IF;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_expense_financials(uuid) TO authenticated;

-- 2) Order sync: revenue is recognized once. If receivable already exists, payment clears receivable, not revenue again.
CREATE OR REPLACE FUNCTION public.sync_order_financials(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  cash_id uuid;
  amount numeric;
  has_receivable_journal boolean := false;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL THEN RETURN; END IF;

  IF o.status = 'cancelled' THEN
    UPDATE public.journal_entries
    SET status = 'void', updated_at = now()
    WHERE tenant_id = o.tenant_id
      AND source_id = o.id
      AND source_type IN ('order_receivable','order_payment')
      AND status <> 'void';
    RETURN;
  END IF;

  amount := COALESCE(o.total, 0);
  IF amount <= 0 THEN RETURN; END IF;

  PERFORM public.ensure_default_chart_accounts_for(o.tenant_id);
  cash_id := public.ensure_default_cash_account_for(o.tenant_id);

  INSERT INTO public.customer_financial_ledger(tenant_id, customer_id, order_id, entry_type, amount, direction, source_type, source_id, description, entry_at)
  VALUES (o.tenant_id, o.customer_id, o.id, 'invoice', amount, 'customer_owes', 'order_invoice', o.id, 'فاتورة طلب #' || COALESCE(o.order_number::text, ''), o.created_at)
  ON CONFLICT (tenant_id, customer_id, entry_type, source_type, source_id)
    WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;

  SELECT EXISTS (
    SELECT 1 FROM public.journal_entries
    WHERE tenant_id = o.tenant_id
      AND source_type = 'order_receivable'
      AND source_id = o.id
      AND status <> 'void'
  ) INTO has_receivable_journal;

  IF o.payment_status = 'paid' THEN
    INSERT INTO public.customer_financial_ledger(tenant_id, customer_id, order_id, entry_type, amount, direction, source_type, source_id, description, entry_at)
    VALUES (o.tenant_id, o.customer_id, o.id, 'payment', amount, 'customer_paid', 'order_payment', o.id, 'سداد طلب #' || COALESCE(o.order_number::text, ''), now())
    ON CONFLICT (tenant_id, customer_id, entry_type, source_type, source_id)
      WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;

    INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at)
    VALUES (o.tenant_id, cash_id, 'in', amount, 'order_payment', o.id, 'تحصيل طلب #' || COALESCE(o.order_number::text, ''), now())
    ON CONFLICT (tenant_id, source_type, source_id, direction)
      WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void' DO NOTHING;

    IF has_receivable_journal THEN
      PERFORM public.create_journal_entry_for_tenant(o.tenant_id, CURRENT_DATE, 'تحصيل ذمة طلب #' || COALESCE(o.order_number::text, ''), 'order_payment', o.id,
        jsonb_build_array(
          jsonb_build_object('account_code','1000','debit',amount,'credit',0,'memo','تحصيل نقدي'),
          jsonb_build_object('account_code','1100','debit',0,'credit',amount,'memo','إقفال ذمة العميل')
        )
      );
    ELSE
      PERFORM public.create_journal_entry_for_tenant(o.tenant_id, CURRENT_DATE, 'تحصيل إيراد طلب #' || COALESCE(o.order_number::text, ''), 'order_payment', o.id,
        jsonb_build_array(
          jsonb_build_object('account_code','1000','debit',amount,'credit',0,'memo','تحصيل نقدي'),
          jsonb_build_object('account_code','4000','debit',0,'credit',amount,'memo','إيراد خدمات')
        )
      );
    END IF;
  ELSE
    PERFORM public.create_journal_entry_for_tenant(o.tenant_id, o.created_at::date, 'إثبات ذمة طلب #' || COALESCE(o.order_number::text, ''), 'order_receivable', o.id,
      jsonb_build_array(
        jsonb_build_object('account_code','1100','debit',amount,'credit',0,'memo','ذمم عملاء'),
        jsonb_build_object('account_code','4000','debit',0,'credit',amount,'memo','إيراد خدمات آجل')
      )
    );
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_order_financials(uuid) TO authenticated;

-- 3) Monthly aggregate postings duplicate the automatic per-order/per-expense journals. Void them.
UPDATE public.journal_entries
SET status = 'void', updated_at = now()
WHERE status <> 'void'
  AND source_type IN (
    'month_paid_revenue_2026-06',
    'month_unpaid_revenue_2026-06',
    'month_paid_expenses_2026-06',
    'month_payable_expenses_2026-06'
  );

UPDATE public.journal_entries
SET status = 'void', updated_at = now()
WHERE status <> 'void'
  AND source_type LIKE 'month\_%' ESCAPE '\';

-- 4) Re-sync existing paid expenses/orders so payment entries clear liabilities/receivables instead of duplicating P&L.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.expenses WHERE status IN ('paid','payable') LOOP
    PERFORM public.sync_expense_financials(r.id);
  END LOOP;

  FOR r IN SELECT id FROM public.orders WHERE status <> 'cancelled' LOOP
    PERFORM public.sync_order_financials(r.id);
  END LOOP;
END $$;
