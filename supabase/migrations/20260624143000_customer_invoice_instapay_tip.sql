-- Customer invoice download + InstaPay proof submission + overpayment tip allocation.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_payment_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS payment_detected_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS payment_verification_status text NOT NULL DEFAULT 'none' CHECK (payment_verification_status IN ('none','pending_review','matched','overpaid','underpaid','rejected')),
  ADD COLUMN IF NOT EXISTS overpayment_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tip_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz;

-- Allow customer portal anonymous upload to public proof bucket.
DROP POLICY IF EXISTS payment_proofs_anon_insert ON storage.objects;
CREATE POLICY payment_proofs_anon_insert ON storage.objects
FOR INSERT TO anon
WITH CHECK (bucket_id = 'payment-proofs');
DROP POLICY IF EXISTS payment_proofs_anon_read ON storage.objects;
CREATE POLICY payment_proofs_anon_read ON storage.objects
FOR SELECT TO anon
USING (bucket_id = 'payment-proofs');

DROP FUNCTION IF EXISTS public.customer_portal_orders(text, text);
CREATE FUNCTION public.customer_portal_orders(_phone text, _slug text DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  order_number integer,
  status public.order_status,
  payment_status public.payment_status,
  payment_method public.payment_method,
  total numeric,
  created_at timestamptz,
  promised_delivery_at timestamptz,
  invoice_finalized_at timestamptz,
  payment_proof_url text,
  customer_payment_amount numeric,
  payment_verification_status text,
  overpayment_amount numeric,
  notes text,
  order_items jsonb
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH c AS (
    SELECT c.id
    FROM public.customers c
    LEFT JOIN public.tenants t ON t.id = c.tenant_id
    WHERE public.portal_phone_key(c.phone) = public.portal_phone_key(_phone)
      AND (_slug IS NULL OR t.slug = _slug)
    ORDER BY c.created_at DESC LIMIT 1
  )
  SELECT o.id, o.order_number, o.status, o.payment_status, o.payment_method, o.total, o.created_at, o.promised_delivery_at,
    o.invoice_finalized_at, o.payment_proof_url, o.customer_payment_amount, o.payment_verification_status, o.overpayment_amount, o.notes,
    COALESCE(jsonb_agg(jsonb_build_object('name', oi.name, 'qty', oi.qty, 'unit_price', oi.unit_price, 'line_total', oi.line_total)) FILTER (WHERE oi.id IS NOT NULL), '[]'::jsonb) AS order_items
  FROM public.orders o
  JOIN c ON c.id = o.customer_id
  LEFT JOIN public.order_items oi ON oi.order_id = o.id
  GROUP BY o.id
  ORDER BY o.created_at DESC
  LIMIT 20
$$;
GRANT EXECUTE ON FUNCTION public.customer_portal_orders(text, text) TO anon, authenticated;

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
  o record;
  paid numeric;
  extra numeric;
  driver_id uuid;
  cash_id uuid;
BEGIN
  SELECT o.*, c.phone, t.slug INTO o
  FROM public.orders o
  JOIN public.customers c ON c.id = o.customer_id
  LEFT JOIN public.tenants t ON t.id = o.tenant_id
  WHERE o.id = _order_id
    AND public.portal_phone_key(c.phone) = public.portal_phone_key(_phone)
    AND (_slug IS NULL OR t.slug = _slug)
  LIMIT 1;

  IF o.id IS NULL THEN RAISE EXCEPTION 'الطلب غير موجود'; END IF;
  IF o.invoice_finalized_at IS NULL THEN RAISE EXCEPTION 'الفاتورة لم تتم مراجعتها واعتمادها بعد'; END IF;
  IF COALESCE(_amount,0) <= 0 THEN RAISE EXCEPTION 'قيمة الدفع غير صحيحة'; END IF;

  paid := COALESCE(_detected_amount, _amount);
  extra := GREATEST(0, paid - COALESCE(o.total,0));
  driver_id := o.assigned_driver_employee_id;

  UPDATE public.orders
  SET payment_proof_url = _proof_url,
      payment_proof_uploaded_at = now(),
      customer_payment_amount = _amount,
      payment_detected_amount = _detected_amount,
      payment_method = 'instapay',
      payment_verification_status = CASE
        WHEN paid < COALESCE(o.total,0) THEN 'underpaid'
        WHEN extra > 0 THEN 'overpaid'
        ELSE 'matched'
      END,
      overpayment_amount = extra,
      tip_employee_id = CASE WHEN extra > 0 THEN driver_id ELSE tip_employee_id END,
      payment_status = CASE WHEN paid >= COALESCE(o.total,0) THEN 'paid' ELSE payment_status END,
      payment_verified_at = CASE WHEN paid >= COALESCE(o.total,0) THEN now() ELSE payment_verified_at END
  WHERE id = o.id;

  -- Main order payment financial sync is handled by orders trigger after payment_status becomes paid.
  IF extra > 0 AND driver_id IS NOT NULL THEN
    cash_id := public.ensure_default_cash_account_for(o.tenant_id);
    INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at)
    VALUES (o.tenant_id, cash_id, 'in', extra, 'driver_tip', o.id, 'بقشيش زيادة دفع طلب #' || COALESCE(o.order_number::text,''), now())
    ON CONFLICT (tenant_id, source_type, source_id, direction) WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void' DO NOTHING;

    INSERT INTO public.employee_financial_ledger(tenant_id, employee_id, entry_type, amount, direction, source_type, source_id, description, entry_at)
    VALUES (o.tenant_id, driver_id, 'adjustment', extra, 'employee_due', 'driver_tip', o.id, 'بقشيش من زيادة دفع طلب #' || COALESCE(o.order_number::text,''), now())
    ON CONFLICT (tenant_id, employee_id, entry_type, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;

    PERFORM public.create_journal_entry_for_tenant(o.tenant_id, CURRENT_DATE, 'بقشيش مندوب من زيادة دفع طلب #' || COALESCE(o.order_number::text,''), 'driver_tip', o.id,
      jsonb_build_array(
        jsonb_build_object('account_code','1000','debit',extra,'credit',0,'memo','زيادة محصلة'),
        jsonb_build_object('account_code','2100','debit',0,'credit',extra,'memo','بقشيش مستحق للمندوب')
      )
    );
  END IF;

  RETURN QUERY SELECT
    (SELECT payment_verification_status FROM public.orders WHERE id = o.id),
    o.total::numeric,
    paid::numeric,
    extra::numeric,
    CASE
      WHEN paid < COALESCE(o.total,0) THEN 'المبلغ أقل من المطلوب، سيحتاج مراجعة'
      WHEN extra > 0 THEN 'تم تسجيل الدفع والزائد كبقشيش للمندوب'
      ELSE 'تم تسجيل الدفع بنجاح'
    END;
END;
$$;
GRANT EXECUTE ON FUNCTION public.customer_portal_submit_instapay_payment(text,text,uuid,text,numeric,numeric) TO anon, authenticated;
