-- MJRH V2 — Close stale station notifications and delivered unit leftovers
-- Date: 2026-06-28

CREATE OR REPLACE FUNCTION public.close_order_stale_notifications(_order_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  closed_count integer := 0;
BEGIN
  SELECT id, tenant_id, order_number INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL THEN RETURN 0; END IF;

  UPDATE public.app_notifications n
  SET read_at = COALESCE(read_at, now())
  WHERE n.tenant_id = o.tenant_id
    AND n.read_at IS NULL
    AND (
      n.href = '/orders/' || o.id::text
      OR n.body ILIKE '%طلب #' || o.order_number::text || '%'
      OR EXISTS (
        SELECT 1 FROM public.service_units su
        WHERE su.order_id = o.id
          AND su.label_code IS NOT NULL
          AND n.body ILIKE '%' || su.label_code || '%'
      )
    );
  GET DIAGNOSTICS closed_count = ROW_COUNT;
  RETURN closed_count;
END;
$$;

-- Make delivered orders actually close their pieces.
CREATE OR REPLACE FUNCTION public.close_order_units_if_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' THEN
    UPDATE public.service_units
    SET status = 'delivered',
        current_stage = 'delivered',
        needs_reclean = false,
        reclean_resolved_at = COALESCE(reclean_resolved_at, now()),
        updated_at = now()
    WHERE order_id = NEW.id
      AND status <> 'cancelled';
    PERFORM public.close_order_stale_notifications(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_close_order_units_if_delivered ON public.orders;
CREATE TRIGGER trg_close_order_units_if_delivered
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.close_order_units_if_delivered();

CREATE OR REPLACE FUNCTION public.resolve_reclean_return(_unit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u record;
BEGIN
  SELECT su.*, o.status AS order_status, o.order_number INTO u
  FROM public.service_units su
  JOIN public.orders o ON o.id = su.order_id
  WHERE su.id = _unit_id;
  IF u.id IS NULL THEN RAISE EXCEPTION 'القطعة غير موجودة'; END IF;

  UPDATE public.service_units
  SET needs_reclean = false,
      reclean_resolved_at = now(),
      current_stage = CASE WHEN u.order_status = 'delivered' THEN 'delivered' ELSE 'ironing' END,
      status = CASE WHEN u.order_status = 'delivered' THEN 'delivered' ELSE status END,
      assigned_ironing_employee_id = COALESCE(u.reclean_return_to_employee_id, u.assigned_ironing_employee_id),
      ironing_assigned_at = CASE WHEN u.order_status = 'delivered' THEN ironing_assigned_at ELSE now() END,
      ironing_completed_at = CASE WHEN u.order_status = 'delivered' THEN ironing_completed_at ELSE NULL END
  WHERE id = _unit_id;

  -- Close old cleaning/ops/owner notifications for this unit.
  UPDATE public.app_notifications
  SET read_at = COALESCE(read_at, now())
  WHERE tenant_id = u.tenant_id
    AND read_at IS NULL
    AND (
      body ILIKE '%' || u.label_code || '%'
      OR body ILIKE '%طلب #' || COALESCE(u.order_number::text,'') || '%'
    )
    AND (title ILIKE '%مرتجع%' OR title ILIKE '%غسيل%' OR title ILIKE '%كي%');

  IF u.order_status <> 'delivered' AND COALESCE(u.reclean_return_to_employee_id, u.assigned_ironing_employee_id) IS NOT NULL THEN
    INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone)
    VALUES (u.tenant_id, 'ironing', 'مرتجع تنظيف رجع للكي', u.label_code || ' جاهزة لإعادة الكي', '/stations/ironing', 'warning');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_delivery_with_collection(_order_id uuid, _collected_amount numeric DEFAULT NULL, _driver_employee_id uuid DEFAULT NULL)
RETURNS TABLE(status text, overpayment numeric, message text)
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
  IF NOT (public.is_privileged_context() OR public.can_access_branch(o.tenant_id, o.branch_id)) THEN RAISE EXCEPTION 'Not allowed'; END IF;

  driver_id := COALESCE(_driver_employee_id, o.assigned_driver_employee_id);
  extra := COALESCE(o.overpayment_amount, 0);

  IF o.payment_status <> 'paid' THEN
    paid := COALESCE(_collected_amount, 0);
    IF paid < COALESCE(o.total,0) THEN RAISE EXCEPTION 'المبلغ المحصل أقل من المطلوب. المطلوب %', COALESCE(o.total,0); END IF;
    extra := GREATEST(0, paid - COALESCE(o.total,0));
    UPDATE public.orders
    SET payment_status = 'paid', payment_method = COALESCE(payment_method, 'cod_cash'), customer_payment_amount = paid,
        overpayment_amount = extra, tip_employee_id = CASE WHEN extra > 0 THEN driver_id ELSE tip_employee_id END,
        payment_verification_status = CASE WHEN extra > 0 THEN 'overpaid' ELSE 'matched' END, payment_verified_at = now()
    WHERE id = o.id;

    IF extra > 0 AND driver_id IS NOT NULL THEN
      cash_id := public.ensure_default_cash_account_for(o.tenant_id);
      IF NOT EXISTS (SELECT 1 FROM public.cash_transactions ct WHERE ct.tenant_id=o.tenant_id AND ct.source_type='driver_tip' AND ct.source_id=o.id AND ct.direction='in' AND ct.status <> 'void') THEN
        INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at)
        VALUES (o.tenant_id, cash_id, 'in', extra, 'driver_tip', o.id, 'بقشيش زيادة دفع طلب #' || COALESCE(o.order_number::text,''), now());
      END IF;

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
  END IF;

  UPDATE public.orders SET status = 'delivered', delivered_at = COALESCE(delivered_at, now()), updated_at = now() WHERE id = o.id;
  PERFORM public.close_order_stale_notifications(o.id);
  RETURN QUERY SELECT 'delivered'::text, extra::numeric, 'تم التسليم'::text;
END;
$$;
GRANT EXECUTE ON FUNCTION public.confirm_delivery_with_collection(uuid,numeric,uuid) TO authenticated;

-- One-time cleanup for already delivered orders and their stale notifications.
UPDATE public.orders SET delivered_at = COALESCE(delivered_at, updated_at, now()) WHERE status = 'delivered' AND delivered_at IS NULL;
UPDATE public.service_units su
SET status='delivered', current_stage='delivered', needs_reclean=false, reclean_resolved_at=COALESCE(reclean_resolved_at, now()), updated_at=now()
FROM public.orders o
WHERE o.id=su.order_id AND o.status='delivered' AND su.status <> 'cancelled';

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.orders WHERE status='delivered' LOOP
    PERFORM public.close_order_stale_notifications(r.id);
  END LOOP;
END $$;
