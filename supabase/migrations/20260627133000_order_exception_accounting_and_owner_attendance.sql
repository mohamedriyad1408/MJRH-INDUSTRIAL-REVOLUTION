-- MJRH V2 — Order exception accounting and owner attendance cleanup
-- Date: 2026-06-27
-- Purpose:
-- Operational exceptions must be accounted, not blocked.
-- Paid cancelled orders create a customer-credit liability instead of silently voiding cash.

-- Add a system liability account for customer credits/refunds.
CREATE OR REPLACE FUNCTION public.ensure_default_chart_accounts_for(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chart_accounts(tenant_id, code, name, account_type, normal_balance, is_system)
  VALUES
    (_tenant_id,'1000','الخزنة / النقدية','asset','debit',true),
    (_tenant_id,'1010','البنك / InstaPay','asset','debit',true),
    (_tenant_id,'1100','ذمم العملاء','asset','debit',true),
    (_tenant_id,'1200','المخزون','asset','debit',true),
    (_tenant_id,'2000','مصروفات مستحقة / دائنون','liability','credit',true),
    (_tenant_id,'2100','رواتب مستحقة','liability','credit',true),
    (_tenant_id,'2200','أرصدة عملاء / مبالغ قابلة للرد','liability','credit',true),
    (_tenant_id,'3000','رأس المال','equity','credit',true),
    (_tenant_id,'4000','إيرادات الخدمات','revenue','credit',true),
    (_tenant_id,'4100','إيرادات التوصيل','revenue','credit',true),
    (_tenant_id,'5000','مصروفات الرواتب','expense','debit',true),
    (_tenant_id,'5100','مصروفات تشغيلية','expense','debit',true),
    (_tenant_id,'5200','إيجار ومرافق','expense','debit',true),
    (_tenant_id,'5300','مخزون مستهلك','expense','debit',true)
  ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    account_type = EXCLUDED.account_type,
    normal_balance = EXCLUDED.normal_balance,
    is_system = true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_default_chart_accounts_for(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_order_financials(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  cash_id uuid;
  cash_code text := '1000';
  amount numeric;
  has_receivable_journal boolean := false;
  has_posted_payment_cash boolean := false;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL THEN RETURN; END IF;
  IF NOT public.can_manage_tenant_finance(o.tenant_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;

  amount := COALESCE(o.total, 0);
  IF amount <= 0 THEN RETURN; END IF;

  PERFORM public.ensure_default_chart_accounts_for(o.tenant_id);
  cash_id := public.ensure_default_cash_account_for(o.tenant_id);
  SELECT CASE WHEN account_type IN ('bank','wallet','instapay') THEN '1010' ELSE '1000' END INTO cash_code FROM public.cash_accounts WHERE id = cash_id;

  SELECT EXISTS (
    SELECT 1 FROM public.cash_transactions ct
    WHERE ct.tenant_id = o.tenant_id
      AND ct.source_type = 'order_payment'
      AND ct.source_id = o.id
      AND ct.status = 'posted'
  ) INTO has_posted_payment_cash;

  IF o.status = 'cancelled' THEN
    -- Spirit of the rule: cancellation does not erase real cash collection.
    -- If the order was paid/collected, keep cash and classify it as customer credit/refundable liability.
    IF o.payment_status = 'paid' OR has_posted_payment_cash THEN
      INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at)
      VALUES (o.tenant_id, cash_id, 'in', amount, 'order_payment', o.id, 'تحصيل طلب ملغي #' || COALESCE(o.order_number::text, ''), COALESCE(o.payment_verified_at, o.updated_at, now()))
      ON CONFLICT (tenant_id, source_type, source_id, direction)
        WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void'
      DO UPDATE SET amount = EXCLUDED.amount, description = EXCLUDED.description, status = 'posted';

      PERFORM public.create_journal_entry_for_tenant(o.tenant_id, COALESCE(o.cancelled_at, now())::date, 'تحويل تحصيل طلب ملغي لرصيد عميل #' || COALESCE(o.order_number::text, ''), 'order_payment', o.id,
        jsonb_build_array(
          jsonb_build_object('account_code', cash_code, 'debit', amount, 'credit', 0, 'memo', 'نقدية محصلة فعليًا'),
          jsonb_build_object('account_code', '2200', 'debit', 0, 'credit', amount, 'memo', 'رصيد مستحق للعميل بسبب إلغاء الطلب')
        )
      );

      INSERT INTO public.customer_financial_ledger(tenant_id, customer_id, order_id, entry_type, amount, direction, source_type, source_id, description, entry_at)
      VALUES (o.tenant_id, o.customer_id, o.id, 'adjustment', amount, 'customer_paid', 'order_cancel_credit', o.id, 'رصيد للعميل نتيجة إلغاء طلب مدفوع #' || COALESCE(o.order_number::text, ''), COALESCE(o.cancelled_at, now()))
      ON CONFLICT (tenant_id, customer_id, entry_type, source_type, source_id)
        WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;
    ELSE
      -- Unpaid cancellation: remove receivable/revenue recognition if any.
      UPDATE public.journal_entries
      SET status = 'void', updated_at = now()
      WHERE tenant_id = o.tenant_id
        AND source_id = o.id
        AND source_type IN ('order_receivable','order_payment')
        AND status <> 'void';
    END IF;

    -- A cancelled order should not keep an open receivable.
    UPDATE public.journal_entries
    SET status = 'void', updated_at = now()
    WHERE tenant_id = o.tenant_id
      AND source_id = o.id
      AND source_type = 'order_receivable'
      AND status <> 'void';
    RETURN;
  END IF;

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
      WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void'
    DO UPDATE SET amount = EXCLUDED.amount, cash_account_id = EXCLUDED.cash_account_id, description = EXCLUDED.description, happened_at = EXCLUDED.happened_at, status = 'posted';

    IF has_receivable_journal THEN
      PERFORM public.create_journal_entry_for_tenant(o.tenant_id, CURRENT_DATE, 'تحصيل ذمة طلب #' || COALESCE(o.order_number::text, ''), 'order_payment', o.id,
        jsonb_build_array(
          jsonb_build_object('account_code', cash_code, 'debit', amount, 'credit', 0, 'memo', 'تحصيل نقدي'),
          jsonb_build_object('account_code', '1100', 'debit', 0, 'credit', amount, 'memo', 'إقفال ذمة العميل')
        )
      );
    ELSE
      PERFORM public.create_journal_entry_for_tenant(o.tenant_id, CURRENT_DATE, 'تحصيل إيراد طلب #' || COALESCE(o.order_number::text, ''), 'order_payment', o.id,
        jsonb_build_array(
          jsonb_build_object('account_code', cash_code, 'debit', amount, 'credit', 0, 'memo', 'تحصيل نقدي'),
          jsonb_build_object('account_code', '4000', 'debit', 0, 'credit', amount, 'memo', 'إيراد خدمات')
        )
      );
    END IF;
  ELSE
    PERFORM public.create_journal_entry_for_tenant(o.tenant_id, o.created_at::date, 'إثبات ذمة طلب #' || COALESCE(o.order_number::text, ''), 'order_receivable', o.id,
      jsonb_build_array(
        jsonb_build_object('account_code', '1100', 'debit', amount, 'credit', 0, 'memo', 'ذمم عملاء'),
        jsonb_build_object('account_code', '4000', 'debit', 0, 'credit', amount, 'memo', 'إيراد خدمات آجل')
      )
    );
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_order_financials(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_order_with_reason(_order_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
BEGIN
  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN RAISE EXCEPTION 'سبب الإلغاء مطلوب'; END IF;
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'الطلب غير موجود'; END IF;
  IF NOT (public.is_privileged_context() OR public.can_access_branch(o.tenant_id, o.branch_id)) THEN RAISE EXCEPTION 'Not allowed'; END IF;

  UPDATE public.orders
  SET status = 'cancelled', cancel_reason = _reason, cancelled_at = now(), cancelled_by = auth.uid()
  WHERE id = _order_id;

  UPDATE public.service_units
  SET status = 'cancelled', current_stage = 'cancelled', cancelled_at = now(), cancel_reason = _reason, cancelled_by = auth.uid()
  WHERE order_id = _order_id;

  INSERT INTO public.order_cancellations(tenant_id, order_id, cancel_type, reason, amount_delta, cancelled_by)
  VALUES (o.tenant_id, _order_id, 'order', _reason, COALESCE(o.total,0), auth.uid());

  PERFORM public.sync_order_financials(_order_id);

  INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone)
  VALUES (
    o.tenant_id,
    'owner',
    CASE WHEN o.payment_status = 'paid' THEN 'تم إلغاء طلب مدفوع وتحويله لرصيد عميل' ELSE 'تم إلغاء طلب' END,
    'طلب #' || COALESCE(o.order_number::text,'') || ' - السبب: ' || _reason,
    '/orders/' || _order_id,
    CASE WHEN o.payment_status = 'paid' THEN 'warning' ELSE 'info' END
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.cancel_order_with_reason(uuid,text) TO authenticated;

-- Re-sync existing cancelled paid/collected orders into customer-credit accounting.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT o.id
    FROM public.orders o
    WHERE o.status = 'cancelled'
      AND COALESCE(o.total,0) > 0
      AND (
        o.payment_status = 'paid'
        OR EXISTS (SELECT 1 FROM public.cash_transactions ct WHERE ct.source_type='order_payment' AND ct.source_id=o.id)
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
