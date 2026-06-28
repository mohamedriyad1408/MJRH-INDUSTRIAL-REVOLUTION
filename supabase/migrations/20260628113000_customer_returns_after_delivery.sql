-- MJRH V2 — Customer returns after delivery
-- Date: 2026-06-28
-- Delivered orders stay delivered. Returned pieces get a separate return case linked to the original order/unit.

CREATE TABLE IF NOT EXISTS public.customer_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  service_unit_id uuid NOT NULL REFERENCES public.service_units(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  return_type text NOT NULL CHECK (return_type IN ('reclean','reiron','repair','refund','other')),
  reason text NOT NULL CHECK (length(trim(reason)) >= 3),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_cleaning','in_ironing','in_packing','in_qc','ready_for_delivery','resolved','cancelled')),
  current_stage text NOT NULL DEFAULT 'open',
  photo_url text,
  billable boolean NOT NULL DEFAULT false,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  received_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_returns_tenant_status_idx ON public.customer_returns(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_returns_order_idx ON public.customer_returns(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_returns_unit_open_idx ON public.customer_returns(service_unit_id) WHERE status NOT IN ('resolved','cancelled');

ALTER TABLE public.customer_returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_returns_tenant_all ON public.customer_returns;
CREATE POLICY customer_returns_tenant_all ON public.customer_returns
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_returns TO authenticated;
GRANT ALL ON public.customer_returns TO service_role;

CREATE OR REPLACE FUNCTION public.set_customer_return_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ord record;
BEGIN
  SELECT o.tenant_id, o.branch_id, o.customer_id INTO ord FROM public.orders o WHERE o.id = NEW.order_id;
  IF NEW.tenant_id IS NULL THEN NEW.tenant_id := ord.tenant_id; END IF;
  IF NEW.branch_id IS NULL THEN NEW.branch_id := ord.branch_id; END IF;
  IF NEW.customer_id IS NULL THEN NEW.customer_id := ord.customer_id; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_return_defaults ON public.customer_returns;
CREATE TRIGGER trg_customer_return_defaults
BEFORE INSERT OR UPDATE ON public.customer_returns
FOR EACH ROW EXECUTE FUNCTION public.set_customer_return_defaults();

CREATE OR REPLACE FUNCTION public.active_customer_return_for_unit(_unit_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.customer_returns
  WHERE service_unit_id = _unit_id
    AND status NOT IN ('resolved','cancelled')
  ORDER BY created_at DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.register_customer_return(
  _order_id uuid,
  _service_unit_id uuid,
  _return_type text,
  _reason text,
  _photo_url text DEFAULT NULL,
  _billable boolean DEFAULT false,
  _amount numeric DEFAULT 0
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ord record;
  su record;
  ret_id uuid;
  stage text;
  ret_status text;
BEGIN
  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN RAISE EXCEPTION 'سبب المرتجع مطلوب'; END IF;
  IF _return_type NOT IN ('reclean','reiron','repair','refund','other') THEN RAISE EXCEPTION 'نوع المرتجع غير صحيح'; END IF;

  SELECT * INTO ord FROM public.orders WHERE id = _order_id;
  IF ord.id IS NULL THEN RAISE EXCEPTION 'الطلب غير موجود'; END IF;
  IF ord.status <> 'delivered' THEN RAISE EXCEPTION 'مرتجع العميل بعد التسليم يسجل فقط على طلب تم تسليمه'; END IF;
  IF NOT (public.is_privileged_context() OR public.can_access_branch(ord.tenant_id, ord.branch_id)) THEN RAISE EXCEPTION 'Not allowed'; END IF;

  SELECT * INTO su FROM public.service_units WHERE id = _service_unit_id AND order_id = _order_id;
  IF su.id IS NULL THEN RAISE EXCEPTION 'القطعة غير موجودة داخل هذا الطلب'; END IF;

  IF public.active_customer_return_for_unit(_service_unit_id) IS NOT NULL THEN
    RAISE EXCEPTION 'يوجد مرتجع مفتوح بالفعل لهذه القطعة';
  END IF;

  stage := CASE
    WHEN _return_type = 'reclean' THEN 'customer_return_cleaning'
    WHEN _return_type = 'reiron' THEN 'ironing'
    WHEN _return_type = 'repair' THEN 'customer_return_repair'
    ELSE 'customer_return_review'
  END;
  ret_status := CASE
    WHEN _return_type = 'reclean' THEN 'in_cleaning'
    WHEN _return_type = 'reiron' THEN 'in_ironing'
    WHEN _return_type = 'repair' THEN 'open'
    ELSE 'open'
  END;

  INSERT INTO public.customer_returns(tenant_id, branch_id, order_id, service_unit_id, customer_id, return_type, reason, status, current_stage, photo_url, billable, amount, created_by)
  VALUES (ord.tenant_id, ord.branch_id, ord.id, su.id, ord.customer_id, _return_type, trim(_reason), ret_status, stage, _photo_url, COALESCE(_billable,false), GREATEST(0, COALESCE(_amount,0)), auth.uid())
  RETURNING id INTO ret_id;

  UPDATE public.service_units
  SET status = 'customer_return',
      current_stage = stage,
      needs_reclean = (_return_type = 'reclean'),
      reclean_reason = CASE WHEN _return_type = 'reclean' THEN trim(_reason) ELSE reclean_reason END,
      reclean_reported_by = auth.uid(),
      reclean_reported_at = now(),
      reclean_resolved_at = NULL,
      reclean_return_to_employee_id = COALESCE(assigned_ironing_employee_id, reclean_return_to_employee_id),
      ironing_completed_at = CASE WHEN _return_type IN ('reclean','reiron') THEN NULL ELSE ironing_completed_at END,
      updated_at = now()
  WHERE id = su.id;

  IF _return_type = 'reiron' THEN
    PERFORM public.rebalance_ironing_assignments(ord.id, ord.tenant_id, ord.branch_id);
  END IF;

  INSERT INTO public.app_notifications(tenant_id, branch_id, audience, title, body, href, tone)
  VALUES
    (ord.tenant_id, ord.branch_id, 'owner', 'مرتجع عميل بعد التسليم', 'طلب #' || ord.order_number || ' — ' || su.label_code || ' — ' || trim(_reason), '/orders/' || ord.id, 'warning'),
    (ord.tenant_id, ord.branch_id, 'ops', 'مرتجع عميل بعد التسليم', 'طلب #' || ord.order_number || ' — ' || su.label_code || ' — ' || trim(_reason), CASE WHEN _return_type = 'reclean' THEN '/stations/cleaning' WHEN _return_type = 'reiron' THEN '/stations/ironing' ELSE '/orders/' || ord.id END, 'warning');

  IF _return_type = 'reclean' THEN
    INSERT INTO public.app_notifications(tenant_id, branch_id, audience, title, body, href, tone)
    VALUES (ord.tenant_id, ord.branch_id, 'cleaning', 'مرتجع عميل للتنظيف', su.label_code || ' — ' || trim(_reason), '/stations/cleaning', 'warning');
  ELSIF _return_type = 'reiron' THEN
    INSERT INTO public.app_notifications(tenant_id, branch_id, audience, title, body, href, tone)
    VALUES (ord.tenant_id, ord.branch_id, 'ironing', 'مرتجع عميل للكي', su.label_code || ' — ' || trim(_reason), '/stations/ironing', 'warning');
  END IF;

  INSERT INTO public.customer_messages(tenant_id, customer_id, order_id, channel, template_key, phone, message, status)
  SELECT ord.tenant_id, ord.customer_id, ord.id, 'whatsapp', 'customer_return_opened', c.phone,
         'تم تسجيل مرتجع للقطعة ' || su.label_code || ' من طلب #' || ord.order_number || '. السبب: ' || trim(_reason) || '. سنقوم بمتابعته وإبلاغك عند الجاهزية.',
         'queued'
  FROM public.customers c WHERE c.id = ord.customer_id;

  PERFORM public.record_operation_event('customer_return_registered', 'تسجيل مرتجع عميل بعد التسليم', 'customer_return', ret_id, ord.branch_id, NULL, NULL, 'quality/customer-returns', true, NULL,
    jsonb_build_object('tenant_id', ord.tenant_id, 'order_id', ord.id, 'order_number', ord.order_number, 'unit_id', su.id, 'label_code', su.label_code, 'return_type', _return_type, 'reason', trim(_reason)),
    jsonb_build_object('cash_impact', COALESCE(_billable,false), 'journal_required', COALESCE(_billable,false), 'appears_in_report', true));

  RETURN ret_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.register_customer_return(uuid,uuid,text,text,text,boolean,numeric) TO authenticated;

-- Existing internal reclean resolver now respects active delivered customer returns.
CREATE OR REPLACE FUNCTION public.resolve_reclean_return(_unit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u record;
  ret record;
BEGIN
  SELECT su.*, o.status AS order_status, o.order_number INTO u
  FROM public.service_units su
  JOIN public.orders o ON o.id = su.order_id
  WHERE su.id = _unit_id;
  IF u.id IS NULL THEN RAISE EXCEPTION 'القطعة غير موجودة'; END IF;

  SELECT * INTO ret
  FROM public.customer_returns
  WHERE service_unit_id = _unit_id AND status NOT IN ('resolved','cancelled')
  ORDER BY created_at DESC LIMIT 1;

  IF ret.id IS NOT NULL THEN
    UPDATE public.service_units
    SET needs_reclean = false,
        reclean_resolved_at = now(),
        current_stage = 'ironing',
        status = 'customer_return',
        assigned_ironing_employee_id = COALESCE(u.reclean_return_to_employee_id, u.assigned_ironing_employee_id),
        ironing_assigned_at = now(),
        ironing_completed_at = NULL,
        updated_at = now()
    WHERE id = _unit_id;

    UPDATE public.customer_returns
    SET status = 'in_ironing', current_stage = 'ironing', updated_at = now()
    WHERE id = ret.id;

    UPDATE public.app_notifications
    SET read_at = COALESCE(read_at, now())
    WHERE tenant_id = u.tenant_id AND read_at IS NULL AND body ILIKE '%' || u.label_code || '%'
      AND (title ILIKE '%تنظيف%' OR title ILIKE '%غسيل%' OR title ILIKE '%مرتجع%');

    INSERT INTO public.app_notifications(tenant_id, branch_id, audience, title, body, href, tone)
    VALUES (u.tenant_id, ret.branch_id, 'ironing', 'مرتجع عميل رجع للكي', u.label_code || ' جاهزة لإعادة الكي', '/stations/ironing', 'warning');

    PERFORM public.rebalance_ironing_assignments(u.order_id, u.tenant_id, ret.branch_id);
    RETURN;
  END IF;

  UPDATE public.service_units
  SET needs_reclean = false,
      reclean_resolved_at = now(),
      current_stage = CASE WHEN u.order_status = 'delivered' THEN 'delivered' ELSE 'ironing' END,
      status = CASE WHEN u.order_status = 'delivered' THEN 'delivered' ELSE status END,
      assigned_ironing_employee_id = COALESCE(u.reclean_return_to_employee_id, u.assigned_ironing_employee_id),
      ironing_assigned_at = CASE WHEN u.order_status = 'delivered' THEN ironing_assigned_at ELSE now() END,
      ironing_completed_at = CASE WHEN u.order_status = 'delivered' THEN ironing_completed_at ELSE NULL END
  WHERE id = _unit_id;

  UPDATE public.app_notifications
  SET read_at = COALESCE(read_at, now())
  WHERE tenant_id = u.tenant_id AND read_at IS NULL AND (body ILIKE '%' || u.label_code || '%' OR body ILIKE '%طلب #' || COALESCE(u.order_number::text,'') || '%')
    AND (title ILIKE '%مرتجع%' OR title ILIKE '%غسيل%' OR title ILIKE '%كي%');

  IF u.order_status <> 'delivered' AND COALESCE(u.reclean_return_to_employee_id, u.assigned_ironing_employee_id) IS NOT NULL THEN
    INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone)
    VALUES (u.tenant_id, 'ironing', 'مرتجع تنظيف رجع للكي', u.label_code || ' جاهزة لإعادة الكي', '/stations/ironing', 'warning');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_customer_return_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ret_id uuid;
  new_status text;
BEGIN
  SELECT id INTO ret_id FROM public.customer_returns WHERE service_unit_id = NEW.id AND status NOT IN ('resolved','cancelled') ORDER BY created_at DESC LIMIT 1;
  IF ret_id IS NULL THEN RETURN NEW; END IF;

  new_status := CASE
    WHEN NEW.current_stage IN ('customer_return_cleaning','recleaning') THEN 'in_cleaning'
    WHEN NEW.current_stage IN ('ironing','ironing_done') THEN 'in_ironing'
    WHEN NEW.current_stage IN ('packing','packing_done') THEN 'in_packing'
    WHEN NEW.current_stage IN ('qc_failed','qc_passed') THEN 'in_qc'
    WHEN NEW.current_stage = 'ready' THEN 'ready_for_delivery'
    ELSE NULL
  END;

  IF new_status IS NOT NULL THEN
    UPDATE public.customer_returns SET status = new_status, current_stage = NEW.current_stage, updated_at = now() WHERE id = ret_id;
  END IF;

  IF NEW.current_stage = 'qc_passed' THEN
    UPDATE public.customer_returns SET status = 'ready_for_delivery', current_stage = 'ready_for_delivery', updated_at = now() WHERE id = ret_id;
    INSERT INTO public.app_notifications(tenant_id, branch_id, audience, title, body, href, tone)
    SELECT tenant_id, branch_id, 'ops', 'مرتجع عميل جاهز للتسليم', 'القطعة ' || NEW.label_code || ' جاهزة للتسليم للعميل', '/orders/' || NEW.order_id, 'success'
    FROM public.customer_returns WHERE id = ret_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_customer_return_stage ON public.service_units;
CREATE TRIGGER trg_sync_customer_return_stage
AFTER UPDATE OF current_stage, status, needs_reclean ON public.service_units
FOR EACH ROW EXECUTE FUNCTION public.sync_customer_return_stage();

CREATE OR REPLACE FUNCTION public.complete_customer_return(_return_id uuid, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ret record;
  ord_no int;
  label text;
BEGIN
  SELECT cr.*, o.order_number, su.label_code INTO ret
  FROM public.customer_returns cr
  JOIN public.orders o ON o.id = cr.order_id
  JOIN public.service_units su ON su.id = cr.service_unit_id
  WHERE cr.id = _return_id;
  IF ret.id IS NULL THEN RAISE EXCEPTION 'مرتجع العميل غير موجود'; END IF;

  UPDATE public.customer_returns
  SET status='resolved', current_stage='resolved', resolved_at=now(), resolved_by=auth.uid(), notes=COALESCE(_notes, notes), updated_at=now()
  WHERE id=_return_id;

  UPDATE public.service_units
  SET status='delivered', current_stage='delivered', needs_reclean=false, reclean_resolved_at=COALESCE(reclean_resolved_at, now()), updated_at=now()
  WHERE id=ret.service_unit_id;

  UPDATE public.app_notifications
  SET read_at = COALESCE(read_at, now())
  WHERE tenant_id = ret.tenant_id AND read_at IS NULL AND (body ILIKE '%' || ret.label_code || '%' OR href = '/orders/' || ret.order_id::text);

  INSERT INTO public.customer_messages(tenant_id, customer_id, order_id, channel, template_key, phone, message, status)
  SELECT ret.tenant_id, ret.customer_id, ret.order_id, 'whatsapp', 'customer_return_resolved', c.phone,
         'تم الانتهاء من مرتجع القطعة ' || ret.label_code || ' من طلب #' || ret.order_number || ' وهي جاهزة للتسليم/تم تسليمها. شكراً لثقتك.',
         'queued'
  FROM public.customers c WHERE c.id = ret.customer_id;

  PERFORM public.record_operation_event('customer_return_resolved', 'إغلاق مرتجع عميل بعد التسليم', 'customer_return', ret.id, ret.branch_id, NULL, NULL, 'quality/customer-returns', true, NULL,
    jsonb_build_object('tenant_id', ret.tenant_id, 'order_id', ret.order_id, 'order_number', ret.order_number, 'unit_id', ret.service_unit_id, 'label_code', ret.label_code, 'notes', _notes),
    jsonb_build_object('cash_impact', false, 'journal_required', false, 'appears_in_report', true, 'notification_prepared', true));
END;
$$;
GRANT EXECUTE ON FUNCTION public.complete_customer_return(uuid,text) TO authenticated;
