-- Strong workflow for re-clean returns and cancellation with required reason.

ALTER TABLE public.service_units
  ADD COLUMN IF NOT EXISTS reclean_return_to_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reclean_photo_url text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.order_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  service_unit_id uuid REFERENCES public.service_units(id) ON DELETE SET NULL,
  cancel_type text NOT NULL CHECK (cancel_type IN ('order','invoice_item','service_unit')),
  reason text NOT NULL CHECK (length(trim(reason)) >= 3),
  amount_delta numeric(12,2) NOT NULL DEFAULT 0,
  cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_cancellations_tenant_idx ON public.order_cancellations(tenant_id, order_id, created_at DESC);
ALTER TABLE public.order_cancellations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_cancellations_tenant_all ON public.order_cancellations;
CREATE POLICY order_cancellations_tenant_all ON public.order_cancellations
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_cancellations TO authenticated;
GRANT ALL ON public.order_cancellations TO service_role;

CREATE TABLE IF NOT EXISTS public.app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  audience text NOT NULL DEFAULT 'owner',
  title text NOT NULL,
  body text,
  href text,
  tone text NOT NULL DEFAULT 'info' CHECK (tone IN ('info','warning','danger','success')),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_notifications_tenant_idx ON public.app_notifications(tenant_id, audience, created_at DESC);
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_notifications_tenant_all ON public.app_notifications;
CREATE POLICY app_notifications_tenant_all ON public.app_notifications
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_notifications TO authenticated;
GRANT ALL ON public.app_notifications TO service_role;

CREATE OR REPLACE FUNCTION public.register_reclean_return(_unit_id uuid, _reason text, _photo_url text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u record;
BEGIN
  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN
    RAISE EXCEPTION 'سبب المرتجع مطلوب';
  END IF;
  SELECT su.*, o.order_number, o.customer_id, c.full_name, c.phone INTO u
  FROM public.service_units su
  JOIN public.orders o ON o.id = su.order_id
  LEFT JOIN public.customers c ON c.id = o.customer_id
  WHERE su.id = _unit_id;
  IF u.id IS NULL THEN RAISE EXCEPTION 'القطعة غير موجودة'; END IF;

  UPDATE public.service_units
  SET needs_reclean = true,
      reclean_reason = _reason,
      reclean_photo_url = COALESCE(_photo_url, reclean_photo_url),
      reclean_reported_by = auth.uid(),
      reclean_reported_at = now(),
      reclean_resolved_at = NULL,
      reclean_return_to_employee_id = COALESCE(assigned_ironing_employee_id, reclean_return_to_employee_id),
      current_stage = 'recleaning',
      ironing_completed_at = NULL
  WHERE id = _unit_id;

  INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone)
  VALUES
    (u.tenant_id, 'owner', 'مرتجع تنظيف جديد', 'طلب #' || COALESCE(u.order_number::text,'') || ' - ' || u.label_code || ' - ' || _reason, '/orders/' || u.order_id, 'danger'),
    (u.tenant_id, 'ops', 'مرتجع تنظيف جديد', 'طلب #' || COALESCE(u.order_number::text,'') || ' - ' || u.label_code || ' - ' || _reason, '/stations/cleaning', 'danger'),
    (u.tenant_id, 'cleaning', 'قطعة رجعت للغسيل', u.label_code || ' - ' || _reason, '/stations/cleaning', 'warning');

  IF u.customer_id IS NOT NULL THEN
    INSERT INTO public.customer_messages(tenant_id, customer_id, order_id, channel, template_key, phone, message, status)
    VALUES (u.tenant_id, u.customer_id, u.order_id, 'whatsapp', 'reclean_notice', u.phone,
      'نعتذر، قطعة من طلب #' || COALESCE(u.order_number::text,'') || ' رجعت للغسيل مرة أخرى للمراجعة والجودة. السبب: ' || _reason,
      'queued');
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.register_reclean_return(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_reclean_return(_unit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u record;
BEGIN
  SELECT * INTO u FROM public.service_units WHERE id = _unit_id;
  IF u.id IS NULL THEN RAISE EXCEPTION 'القطعة غير موجودة'; END IF;

  UPDATE public.service_units
  SET needs_reclean = false,
      reclean_resolved_at = now(),
      current_stage = 'ironing',
      assigned_ironing_employee_id = COALESCE(u.reclean_return_to_employee_id, u.assigned_ironing_employee_id),
      ironing_assigned_at = now(),
      ironing_completed_at = NULL
  WHERE id = _unit_id;

  IF COALESCE(u.reclean_return_to_employee_id, u.assigned_ironing_employee_id) IS NOT NULL THEN
    INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone)
    VALUES (u.tenant_id, 'ironing', 'مرتجع تنظيف رجع للكي', u.label_code || ' جاهزة لإعادة الكي', '/stations/ironing', 'warning');
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_reclean_return(uuid) TO authenticated;

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

  UPDATE public.orders SET status = 'cancelled', cancel_reason = _reason, cancelled_at = now(), cancelled_by = auth.uid() WHERE id = _order_id;
  UPDATE public.service_units SET status = 'cancelled', current_stage = 'cancelled', cancelled_at = now(), cancel_reason = _reason, cancelled_by = auth.uid() WHERE order_id = _order_id;

  INSERT INTO public.order_cancellations(tenant_id, order_id, cancel_type, reason, amount_delta, cancelled_by)
  VALUES (o.tenant_id, _order_id, 'order', _reason, COALESCE(o.total,0), auth.uid());

  INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone)
  VALUES (o.tenant_id, 'owner', 'تم إلغاء طلب', 'طلب #' || COALESCE(o.order_number::text,'') || ' - السبب: ' || _reason, '/orders/' || _order_id, 'warning');
END;
$$;
GRANT EXECUTE ON FUNCTION public.cancel_order_with_reason(uuid,text) TO authenticated;
