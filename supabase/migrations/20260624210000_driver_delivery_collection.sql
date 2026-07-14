-- Driver delivery confirmation with collection, overpayment tip, cash and accounting sync.

CREATE OR REPLACE FUNCTION public.confirm_delivery_with_collection(_order_id uuid, _collected_amount numeric DEFAULT NULL, _driver_employee_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  paid numeric;
  extra numeric;
  cash_id uuid;
  driver_id uuid;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'الطلب غير موجود'; END IF;

  driver_id := COALESCE(_driver_employee_id, o.assigned_driver_employee_id);

  IF o.payment_status <> 'paid' THEN
    paid := COALESCE(_collected_amount, 0);
    IF paid < COALESCE(o.total,0) THEN
      RAISE EXCEPTION 'المبلغ المحصل أقل من المطلوب. المطلوب %', COALESCE(o.total,0);
    END IF;
    extra := GREATEST(0, paid - COALESCE(o.total,0));

    UPDATE public.orders
    SET payment_status = 'paid',
        payment_method = COALESCE(payment_method, 'cod_cash'),
        customer_payment_amount = paid,
        overpayment_amount = extra,
        tip_employee_id = CASE WHEN extra > 0 THEN driver_id ELSE tip_employee_id END,
        payment_verification_status = CASE WHEN extra > 0 THEN 'overpaid' ELSE 'matched' END,
        payment_verified_at = now()
    WHERE id = o.id;

    -- Order trigger records main order payment. Record extra tip separately.
    IF extra > 0 AND driver_id IS NOT NULL THEN
      cash_id := public.ensure_default_cash_account_for(o.tenant_id);
      INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at)
      VALUES (o.tenant_id, cash_id, 'in', extra, 'driver_tip_delivery', o.id, 'بقشيش مندوب عند تسليم طلب #' || COALESCE(o.order_number::text,''), now())
      ON CONFLICT (tenant_id, source_type, source_id, direction) WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void' DO NOTHING;

      INSERT INTO public.employee_financial_ledger(tenant_id, employee_id, entry_type, amount, direction, source_type, source_id, description, entry_at)
      VALUES (o.tenant_id, driver_id, 'adjustment', extra, 'employee_due', 'driver_tip_delivery', o.id, 'بقشيش تسليم طلب #' || COALESCE(o.order_number::text,''), now())
      ON CONFLICT (tenant_id, employee_id, entry_type, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;
    END IF;
  ELSE
    paid := COALESCE(o.customer_payment_amount, o.total, 0);
    extra := COALESCE(o.overpayment_amount, 0);
  END IF;

  UPDATE public.orders
  SET status = 'delivered', assigned_driver_employee_id = COALESCE(assigned_driver_employee_id, driver_id)
  WHERE id = o.id;

  RETURN jsonb_build_object('paid_amount', paid, 'overpayment', extra, 'status', 'delivered');
END;
$$;
GRANT EXECUTE ON FUNCTION public.confirm_delivery_with_collection(uuid,numeric,uuid) TO authenticated;
