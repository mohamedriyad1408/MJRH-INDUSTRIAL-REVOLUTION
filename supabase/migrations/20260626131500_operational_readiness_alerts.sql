-- Operational readiness alerts and branch-aware policies for production trial.

-- Strengthen branch-aware access where branch_id now exists.
DROP POLICY IF EXISTS pickups_tenant_all ON public.pickup_requests;
DROP POLICY IF EXISTS pickup_requests_branch_all ON public.pickup_requests;
CREATE POLICY pickup_requests_branch_all ON public.pickup_requests
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id) AND public.can_access_branch(tenant_id, branch_id))
WITH CHECK (public.can_access_tenant(tenant_id) AND public.can_access_branch(tenant_id, branch_id));

DROP POLICY IF EXISTS app_notifications_tenant_all ON public.app_notifications;
DROP POLICY IF EXISTS app_notifications_branch_all ON public.app_notifications;
CREATE POLICY app_notifications_branch_all ON public.app_notifications
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id) AND public.can_access_branch(tenant_id, branch_id))
WITH CHECK (public.can_access_tenant(tenant_id) AND public.can_access_branch(tenant_id, branch_id));

DROP POLICY IF EXISTS equipment_assets_branch_all ON public.equipment_assets;
CREATE POLICY equipment_assets_branch_all ON public.equipment_assets
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id) AND public.can_access_branch(tenant_id, branch_id))
WITH CHECK (public.can_access_tenant(tenant_id) AND public.can_access_branch(tenant_id, branch_id));

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
  today date := CURRENT_DATE;
BEGIN
  IF _tenant_id IS NULL THEN RETURN 0; END IF;

  SELECT count(*) INTO active_cash FROM public.cash_accounts WHERE tenant_id = _tenant_id AND is_active = true;
  SELECT count(*) INTO closed_cash FROM public.daily_cash_closings WHERE tenant_id = _tenant_id AND closing_date = today AND status = 'closed';
  IF active_cash > 0 AND closed_cash < active_cash AND NOT EXISTS (
    SELECT 1 FROM public.app_notifications WHERE tenant_id = _tenant_id AND title = 'تنبيه: إقفال الخزن لم يكتمل' AND created_at::date = today
  ) THEN
    INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone)
    VALUES (_tenant_id, 'owner', 'تنبيه: إقفال الخزن لم يكتمل', 'المقفول اليوم ' || closed_cash || ' من ' || active_cash || '. افتح صفحة إقفال الخزن قبل نهاية اليوم.', '/cash-closing', 'warning');
    created_count := created_count + 1;
  END IF;

  SELECT count(*) INTO apdo_missing
  FROM public.operation_answer_matrix
  WHERE tenant_id = _tenant_id
    AND created_at >= now() - interval '7 days'
    AND (branch_answer <> 'answered' OR cash_answer = 'missing_cash_account' OR journal_answer = 'missing_journal' OR report_answer <> 'answered' OR notification_answer = 'missing_notification');
  IF apdo_missing > 0 AND NOT EXISTS (
    SELECT 1 FROM public.app_notifications WHERE tenant_id = _tenant_id AND title = 'تنبيه: عمليات ناقصة الربط APDO' AND created_at::date = today
  ) THEN
    INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone)
    VALUES (_tenant_id, 'owner', 'تنبيه: عمليات ناقصة الربط APDO', 'يوجد ' || apdo_missing || ' عملية خلال آخر 7 أيام لا تجيب على الفرع/الخزنة/القيد/التقرير/الإشعار بالكامل.', '/system-health', 'warning');
    created_count := created_count + 1;
  END IF;

  SELECT count(*) INTO low_stock
  FROM public.inventory_items
  WHERE tenant_id = _tenant_id AND is_active = true AND COALESCE(current_qty,0) <= COALESCE(reorder_level,0);
  IF low_stock > 0 AND NOT EXISTS (
    SELECT 1 FROM public.app_notifications WHERE tenant_id = _tenant_id AND title = 'تنبيه: مخزون تحت حد الطلب' AND created_at::date = today
  ) THEN
    INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone)
    VALUES (_tenant_id, 'ops', 'تنبيه: مخزون تحت حد الطلب', low_stock || ' صنف وصل أو تعدى حد إعادة الطلب.', '/inventory', 'warning');
    created_count := created_count + 1;
  END IF;

  SELECT count(*) INTO late_orders
  FROM public.orders
  WHERE tenant_id = _tenant_id AND promised_delivery_at < now() AND status NOT IN ('delivered','cancelled');
  IF late_orders > 0 AND NOT EXISTS (
    SELECT 1 FROM public.app_notifications WHERE tenant_id = _tenant_id AND title = 'تنبيه: طلبات متأخرة' AND created_at::date = today
  ) THEN
    INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone)
    VALUES (_tenant_id, 'ops', 'تنبيه: طلبات متأخرة', 'يوجد ' || late_orders || ' طلب تخطى موعد التسليم.', '/today', 'danger');
    created_count := created_count + 1;
  END IF;

  SELECT count(*) INTO qc_critical
  FROM public.qc_checks
  WHERE tenant_id = _tenant_id AND severity IN ('high','critical') AND checked_at >= now() - interval '24 hours';
  IF qc_critical > 0 AND NOT EXISTS (
    SELECT 1 FROM public.app_notifications WHERE tenant_id = _tenant_id AND title = 'تنبيه: مشاكل جودة حرجة' AND created_at::date = today
  ) THEN
    INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone)
    VALUES (_tenant_id, 'ops', 'تنبيه: مشاكل جودة حرجة', 'تم تسجيل ' || qc_critical || ' مشكلة جودة عالية/حرجة خلال 24 ساعة.', '/reports', 'danger');
    created_count := created_count + 1;
  END IF;

  SELECT count(*) INTO not_ready FROM public.tenant_bootstrap_health WHERE tenant_id = _tenant_id AND is_ready = false;
  IF not_ready > 0 AND NOT EXISTS (
    SELECT 1 FROM public.app_notifications WHERE tenant_id = _tenant_id AND title = 'تنبيه: النشاط غير مكتمل الإعداد' AND created_at::date = today
  ) THEN
    INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone)
    VALUES (_tenant_id, 'owner', 'تنبيه: النشاط غير مكتمل الإعداد', 'يوجد إعداد أساسي ناقص: فرع/خزنة/حسابات/موظف/كتالوج.', '/system-health', 'warning');
    created_count := created_count + 1;
  END IF;

  RETURN created_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.generate_smart_operational_alerts(uuid) TO authenticated;
