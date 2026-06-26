-- Delivery readiness audit: ready/out-for-delivery orders that are not actually safe to deliver.

CREATE OR REPLACE VIEW public.delivery_readiness_audit AS
WITH unit_flags AS (
  SELECT
    su.order_id,
    count(*) FILTER (WHERE COALESCE(su.status,'') <> 'cancelled' AND COALESCE(su.current_stage,'') <> 'cancelled') AS total_units,
    count(*) FILTER (WHERE su.needs_reclean = true AND COALESCE(su.status,'') <> 'cancelled') AS reclean_count,
    count(*) FILTER (WHERE su.label_status IS NOT NULL AND su.label_status <> 'labeled' AND COALESCE(su.status,'') <> 'cancelled') AS label_issue_count,
    count(*) FILTER (WHERE COALESCE(su.status,'') <> 'cancelled' AND COALESCE(su.current_stage,'') <> 'cancelled' AND su.current_stage NOT IN ('qc_passed','ready')) AS not_qc_count
  FROM public.service_units su
  GROUP BY su.order_id
)
SELECT
  o.tenant_id,
  o.branch_id,
  o.id AS order_id,
  o.order_number,
  o.status,
  o.payment_status,
  o.assigned_driver_employee_id,
  COALESCE(uf.total_units, 0) AS total_units,
  COALESCE(uf.reclean_count, 0) AS reclean_count,
  COALESCE(uf.label_issue_count, 0) AS label_issue_count,
  COALESCE(uf.not_qc_count, 0) AS not_qc_count,
  CASE WHEN o.status = 'ready' AND o.assigned_driver_employee_id IS NULL THEN 1 ELSE 0 END AS no_driver,
  CASE WHEN o.payment_status <> 'paid' THEN 1 ELSE 0 END AS unpaid,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN COALESCE(uf.total_units,0) = 0 THEN 'no_units' END,
    CASE WHEN COALESCE(uf.reclean_count,0) > 0 THEN 'reclean_open' END,
    CASE WHEN COALESCE(uf.label_issue_count,0) > 0 THEN 'label_issue' END,
    CASE WHEN COALESCE(uf.not_qc_count,0) > 0 THEN 'qc_missing' END,
    CASE WHEN o.status = 'ready' AND o.assigned_driver_employee_id IS NULL THEN 'no_driver' END,
    CASE WHEN o.payment_status <> 'paid' THEN 'unpaid' END
  ], NULL) AS issue_codes,
  (
    COALESCE(uf.total_units,0) > 0
    AND COALESCE(uf.reclean_count,0) = 0
    AND COALESCE(uf.label_issue_count,0) = 0
    AND COALESCE(uf.not_qc_count,0) = 0
    AND NOT (o.status = 'ready' AND o.assigned_driver_employee_id IS NULL)
    AND o.payment_status = 'paid'
  ) AS deliverable,
  o.updated_at
FROM public.orders o
LEFT JOIN unit_flags uf ON uf.order_id = o.id
WHERE o.status IN ('ready','out_for_delivery');

GRANT SELECT ON public.delivery_readiness_audit TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_smart_operational_alerts(_tenant_id uuid DEFAULT public.current_tenant_id())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_count integer := 0;
  active_cash integer := 0;
  closed_cash integer := 0;
  apdo_missing integer := 0;
  low_stock integer := 0;
  late_orders integer := 0;
  qc_critical integer := 0;
  not_ready integer := 0;
  fin_danger integer := 0;
  delivery_blocked integer := 0;
  today date := CURRENT_DATE;
BEGIN
  IF _tenant_id IS NULL THEN RETURN 0; END IF;

  SELECT count(*) INTO active_cash FROM public.cash_accounts WHERE tenant_id = _tenant_id AND is_active = true;
  SELECT count(*) INTO closed_cash FROM public.daily_cash_closings WHERE tenant_id = _tenant_id AND closing_date = today AND status = 'closed';
  IF active_cash > 0 AND closed_cash < active_cash AND NOT EXISTS (SELECT 1 FROM public.app_notifications WHERE tenant_id = _tenant_id AND title = 'تنبيه: إقفال الخزن لم يكتمل' AND created_at::date = today) THEN
    INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone)
    VALUES (_tenant_id, 'owner', 'تنبيه: إقفال الخزن لم يكتمل', 'المقفول اليوم ' || closed_cash || ' من ' || active_cash || '. افتح صفحة إقفال الخزن قبل نهاية اليوم.', '/cash-closing', 'warning');
    created_count := created_count + 1;
  END IF;

  SELECT count(*) INTO delivery_blocked FROM public.delivery_readiness_audit WHERE tenant_id = _tenant_id AND deliverable = false;
  IF delivery_blocked > 0 AND NOT EXISTS (SELECT 1 FROM public.app_notifications WHERE tenant_id = _tenant_id AND title = 'تنبيه: طلبات جاهزة لا تصلح للتسليم' AND created_at::date = today) THEN
    INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone)
    VALUES (_tenant_id, 'ops', 'تنبيه: طلبات جاهزة لا تصلح للتسليم', 'يوجد ' || delivery_blocked || ' طلب جاهز/خارج للتوصيل لكن به مشكلة: مارك، QC، مرتجع، مندوب أو دفع.', '/system-health', 'danger');
    created_count := created_count + 1;
  END IF;

  SELECT count(*) INTO apdo_missing FROM public.operation_answer_matrix WHERE tenant_id = _tenant_id AND created_at >= now() - interval '7 days' AND (branch_answer <> 'answered' OR cash_answer = 'missing_cash_account' OR journal_answer = 'missing_journal' OR report_answer <> 'answered' OR notification_answer = 'missing_notification');
  IF apdo_missing > 0 AND NOT EXISTS (SELECT 1 FROM public.app_notifications WHERE tenant_id = _tenant_id AND title = 'تنبيه: عمليات ناقصة الربط APDO' AND created_at::date = today) THEN
    INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone)
    VALUES (_tenant_id, 'owner', 'تنبيه: عمليات ناقصة الربط APDO', 'يوجد ' || apdo_missing || ' عملية خلال آخر 7 أيام لا تجيب على الفرع/الخزنة/القيد/التقرير/الإشعار بالكامل.', '/system-health', 'warning');
    created_count := created_count + 1;
  END IF;

  SELECT count(*) INTO fin_danger FROM public.financial_operation_audit WHERE tenant_id = _tenant_id AND severity = 'danger';
  IF fin_danger > 0 AND NOT EXISTS (SELECT 1 FROM public.app_notifications WHERE tenant_id = _tenant_id AND title = 'تنبيه: مراجعة مالية مطلوبة' AND created_at::date = today) THEN
    INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone)
    VALUES (_tenant_id, 'owner', 'تنبيه: مراجعة مالية مطلوبة', 'يوجد ' || fin_danger || ' مشكلة مالية حرجة: حركة بلا خزنة أو قيد أو فرع.', '/system-health', 'danger');
    created_count := created_count + 1;
  END IF;

  SELECT count(*) INTO low_stock FROM public.inventory_items WHERE tenant_id = _tenant_id AND is_active = true AND COALESCE(current_qty,0) <= COALESCE(reorder_level,0);
  IF low_stock > 0 AND NOT EXISTS (SELECT 1 FROM public.app_notifications WHERE tenant_id = _tenant_id AND title = 'تنبيه: مخزون تحت حد الطلب' AND created_at::date = today) THEN
    INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone) VALUES (_tenant_id, 'ops', 'تنبيه: مخزون تحت حد الطلب', low_stock || ' صنف وصل أو تعدى حد إعادة الطلب.', '/inventory', 'warning');
    created_count := created_count + 1;
  END IF;

  SELECT count(*) INTO late_orders FROM public.orders WHERE tenant_id = _tenant_id AND promised_delivery_at < now() AND status NOT IN ('delivered','cancelled');
  IF late_orders > 0 AND NOT EXISTS (SELECT 1 FROM public.app_notifications WHERE tenant_id = _tenant_id AND title = 'تنبيه: طلبات متأخرة' AND created_at::date = today) THEN
    INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone) VALUES (_tenant_id, 'ops', 'تنبيه: طلبات متأخرة', 'يوجد ' || late_orders || ' طلب تخطى موعد التسليم.', '/today', 'danger');
    created_count := created_count + 1;
  END IF;

  SELECT count(*) INTO qc_critical FROM public.qc_checks WHERE tenant_id = _tenant_id AND severity IN ('high','critical') AND checked_at >= now() - interval '24 hours';
  IF qc_critical > 0 AND NOT EXISTS (SELECT 1 FROM public.app_notifications WHERE tenant_id = _tenant_id AND title = 'تنبيه: مشاكل جودة حرجة' AND created_at::date = today) THEN
    INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone) VALUES (_tenant_id, 'ops', 'تنبيه: مشاكل جودة حرجة', 'تم تسجيل ' || qc_critical || ' مشكلة جودة عالية/حرجة خلال 24 ساعة.', '/reports', 'danger');
    created_count := created_count + 1;
  END IF;

  SELECT count(*) INTO not_ready FROM public.tenant_bootstrap_health WHERE tenant_id = _tenant_id AND is_ready = false;
  IF not_ready > 0 AND NOT EXISTS (SELECT 1 FROM public.app_notifications WHERE tenant_id = _tenant_id AND title = 'تنبيه: النشاط غير مكتمل الإعداد' AND created_at::date = today) THEN
    INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone) VALUES (_tenant_id, 'owner', 'تنبيه: النشاط غير مكتمل الإعداد', 'يوجد إعداد أساسي ناقص: فرع/خزنة/حسابات/موظف/كتالوج.', '/system-health', 'warning');
    created_count := created_count + 1;
  END IF;

  RETURN created_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.generate_smart_operational_alerts(uuid) TO authenticated;
