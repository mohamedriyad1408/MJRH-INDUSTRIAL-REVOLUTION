-- MJRH V2 — Fix customer portal InstaPay payment record assignment
-- Date: 2026-06-27
-- Prevents PostgreSQL error: record "o" is not assigned yet.

CREATE OR REPLACE FUNCTION public.customer_portal_submit_instapay_payment(
  _phone text,
  _slug text,
  _order_id uuid,
  _proof_url text,
  _amount numeric,
  _detected_amount numeric DEFAULT NULL
) RETURNS TABLE(status text, required_amount numeric, paid_amount numeric, overpayment numeric, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ord record;
  paid numeric;
  extra numeric;
  driver_id uuid;
  cash_id uuid;
BEGIN
  SELECT o.* INTO ord
  FROM public.orders AS o
  JOIN public.customers AS c ON c.id = o.customer_id
  LEFT JOIN public.tenants AS t ON t.id = o.tenant_id
  WHERE o.id = _order_id
    AND public.portal_phone_key(c.phone) = public.portal_phone_key(_phone)
    AND (_slug IS NULL OR t.slug = _slug)
  LIMIT 1;

  IF NOT FOUND OR ord.id IS NULL THEN RAISE EXCEPTION 'الطلب غير موجود أو لا يخص رقم الهاتف'; END IF;
  IF ord.invoice_finalized_at IS NULL THEN RAISE EXCEPTION 'الفاتورة لم تتم مراجعتها واعتمادها بعد'; END IF;
  IF COALESCE(_amount,0) <= 0 THEN RAISE EXCEPTION 'قيمة الدفع غير صحيحة'; END IF;

  paid := COALESCE(_detected_amount, _amount);
  extra := GREATEST(0, paid - COALESCE(ord.total,0));
  driver_id := ord.assigned_driver_employee_id;

  UPDATE public.orders
  SET payment_proof_url = _proof_url,
      payment_proof_uploaded_at = now(),
      customer_payment_amount = _amount,
      payment_detected_amount = _detected_amount,
      payment_method = 'instapay',
      payment_verification_status = CASE
        WHEN paid < COALESCE(ord.total,0) THEN 'underpaid'
        WHEN extra > 0 THEN 'overpaid'
        ELSE 'matched'
      END,
      overpayment_amount = extra,
      tip_employee_id = CASE WHEN extra > 0 THEN driver_id ELSE tip_employee_id END,
      payment_status = CASE WHEN paid >= COALESCE(ord.total,0) THEN 'paid' ELSE payment_status END,
      payment_verified_at = CASE WHEN paid >= COALESCE(ord.total,0) THEN now() ELSE payment_verified_at END
  WHERE id = ord.id;

  -- Main order payment financial sync is handled by orders trigger after payment_status becomes paid.
  IF extra > 0 AND driver_id IS NOT NULL THEN
    cash_id := public.ensure_default_cash_account_for(ord.tenant_id);
    INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at)
    VALUES (ord.tenant_id, cash_id, 'in', extra, 'driver_tip', ord.id, 'بقشيش زيادة دفع طلب #' || COALESCE(ord.order_number::text,''), now())
    ON CONFLICT (tenant_id, source_type, source_id, direction) WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void' DO NOTHING;

    INSERT INTO public.employee_financial_ledger(tenant_id, employee_id, entry_type, amount, direction, source_type, source_id, description, entry_at)
    VALUES (ord.tenant_id, driver_id, 'adjustment', extra, 'employee_due', 'driver_tip', ord.id, 'بقشيش من زيادة دفع طلب #' || COALESCE(ord.order_number::text,''), now())
    ON CONFLICT (tenant_id, employee_id, entry_type, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;

    PERFORM public.create_journal_entry_for_tenant(ord.tenant_id, CURRENT_DATE, 'بقشيش مندوب من زيادة دفع طلب #' || COALESCE(ord.order_number::text,''), 'driver_tip', ord.id,
      jsonb_build_array(
        jsonb_build_object('account_code','1000','debit',extra,'credit',0,'memo','زيادة محصلة'),
        jsonb_build_object('account_code','2100','debit',0,'credit',extra,'memo','بقشيش مستحق للمندوب')
      )
    );
  END IF;

  RETURN QUERY SELECT
    (SELECT payment_verification_status FROM public.orders WHERE id = ord.id),
    ord.total::numeric,
    paid::numeric,
    extra::numeric,
    CASE
      WHEN paid < COALESCE(ord.total,0) THEN 'المبلغ أقل من المطلوب، سيحتاج مراجعة'
      WHEN extra > 0 THEN 'تم تسجيل الدفع والزائد كبقشيش للمندوب'
      ELSE 'تم تسجيل الدفع بنجاح'
    END;
END;
$$;
GRANT EXECUTE ON FUNCTION public.customer_portal_submit_instapay_payment(text,text,uuid,text,numeric,numeric) TO anon, authenticated;
