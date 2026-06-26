-- Financial readiness audit: one view to catch missing branch/cash/journal/report links before real operation.

CREATE OR REPLACE VIEW public.financial_operation_audit AS
SELECT
  o.tenant_id,
  o.branch_id,
  'finance'::text AS domain,
  'paid_order_missing_cash_tx'::text AS issue_key,
  'طلب مدفوع بلا حركة خزنة'::text AS title,
  ('طلب #' || COALESCE(o.order_number::text, o.id::text) || ' مسجل مدفوع ولا توجد له حركة خزنة order_payment')::text AS detail,
  '/orders/' || o.id::text AS href,
  'order'::text AS source_type,
  o.id AS source_id,
  'danger'::text AS severity,
  o.updated_at AS created_at
FROM public.orders o
WHERE o.payment_status = 'paid'
  AND o.status <> 'cancelled'
  AND NOT EXISTS (
    SELECT 1 FROM public.cash_transactions ct
    WHERE ct.tenant_id = o.tenant_id AND ct.source_type = 'order_payment' AND ct.source_id = o.id AND COALESCE(ct.status,'posted') <> 'void'
  )
UNION ALL
SELECT
  o.tenant_id,
  o.branch_id,
  'accounting',
  'paid_order_missing_journal',
  'طلب مدفوع بلا قيد تحصيل',
  ('طلب #' || COALESCE(o.order_number::text, o.id::text) || ' مدفوع ولا يوجد له قيد order_payment'),
  '/orders/' || o.id::text,
  'order',
  o.id,
  'danger',
  o.updated_at
FROM public.orders o
WHERE o.payment_status = 'paid'
  AND o.status <> 'cancelled'
  AND NOT EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.tenant_id = o.tenant_id AND je.source_type = 'order_payment' AND je.source_id = o.id AND je.status <> 'void'
  )
UNION ALL
SELECT
  o.tenant_id,
  o.branch_id,
  'accounting',
  'receivable_order_missing_journal',
  'طلب آجل بلا قيد ذمة',
  ('طلب #' || COALESCE(o.order_number::text, o.id::text) || ' غير مدفوع ولا يوجد له قيد ذمة order_receivable'),
  '/orders/' || o.id::text,
  'order',
  o.id,
  'warn',
  o.created_at
FROM public.orders o
WHERE o.payment_status <> 'paid'
  AND o.status <> 'cancelled'
  AND COALESCE(o.total,0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.tenant_id = o.tenant_id AND je.source_type = 'order_receivable' AND je.source_id = o.id AND je.status <> 'void'
  )
UNION ALL
SELECT
  e.tenant_id,
  e.branch_id,
  'finance',
  'paid_expense_missing_cash_account',
  'مصروف مدفوع بلا خزنة',
  COALESCE(e.description, 'مصروف') || ' — ' || COALESCE(e.amount,0)::text,
  '/finance',
  'expense',
  e.id,
  'danger',
  e.spent_at
FROM public.expenses e
WHERE e.status = 'paid'
  AND e.cash_account_id IS NULL
  AND COALESCE(e.source_type,'') NOT IN ('payroll_line')
UNION ALL
SELECT
  e.tenant_id,
  e.branch_id,
  'accounting',
  'paid_expense_missing_journal',
  'مصروف مدفوع بلا قيد',
  COALESCE(e.description, 'مصروف') || ' — ' || COALESCE(e.amount,0)::text,
  '/ledger',
  'expense',
  e.id,
  'danger',
  e.spent_at
FROM public.expenses e
WHERE e.status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.tenant_id = e.tenant_id AND je.source_type = 'expense_payment' AND je.source_id = e.id AND je.status <> 'void'
  )
UNION ALL
SELECT
  e.tenant_id,
  e.branch_id,
  'accounting',
  'payable_expense_missing_journal',
  'مصروف آجل بلا قيد استحقاق',
  COALESCE(e.description, 'مصروف آجل') || ' — ' || COALESCE(e.amount,0)::text,
  '/ledger',
  'expense',
  e.id,
  'warn',
  e.spent_at
FROM public.expenses e
WHERE e.status = 'payable'
  AND NOT EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.tenant_id = e.tenant_id AND je.source_type = 'expense_payable' AND je.source_id = e.id AND je.status <> 'void'
  )
UNION ALL
SELECT
  ct.tenant_id,
  ca.branch_id,
  'accounting',
  'cash_tx_missing_journal',
  'حركة خزنة بلا قيد',
  COALESCE(ct.description, 'حركة خزنة') || ' — ' || COALESCE(ct.amount,0)::text,
  '/accounting',
  'cash_transaction',
  ct.id,
  'danger',
  ct.happened_at
FROM public.cash_transactions ct
LEFT JOIN public.cash_accounts ca ON ca.id = ct.cash_account_id
WHERE COALESCE(ct.status,'posted') <> 'void'
  AND COALESCE(ct.source_type,'manual_cash_transaction') IN ('manual_cash_transaction','expense','employee_advance','payroll_payment','order_payment')
  AND NOT EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.tenant_id = ct.tenant_id
      AND je.source_id = COALESCE(ct.source_id, ct.id)
      AND je.status <> 'void'
      AND je.source_type IN ('manual_cash_transaction','expense_payment','order_payment','payroll_payment','employee_advance')
  )
UNION ALL
SELECT tenant_id, branch_id, 'readiness', 'order_missing_branch', 'طلب بلا فرع', 'طلب #' || COALESCE(order_number::text, id::text), '/orders/' || id::text, 'order', id, 'danger', created_at
FROM public.orders WHERE branch_id IS NULL AND status <> 'cancelled'
UNION ALL
SELECT tenant_id, branch_id, 'readiness', 'cash_account_missing_branch', 'خزنة بلا فرع', name, '/accounting', 'cash_account', id, 'danger', created_at
FROM public.cash_accounts WHERE branch_id IS NULL AND is_active = true
UNION ALL
SELECT tenant_id, branch_id, 'readiness', 'inventory_item_missing_branch', 'صنف مخزون بلا فرع', name, '/inventory', 'inventory_item', id, 'warn', created_at
FROM public.inventory_items WHERE branch_id IS NULL AND is_active = true;

GRANT SELECT ON public.financial_operation_audit TO authenticated;

CREATE OR REPLACE FUNCTION public.financial_audit_summary(_tenant_id uuid DEFAULT public.current_tenant_id())
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', count(*),
    'danger', count(*) FILTER (WHERE severity = 'danger'),
    'warn', count(*) FILTER (WHERE severity = 'warn'),
    'finance', count(*) FILTER (WHERE domain = 'finance'),
    'accounting', count(*) FILTER (WHERE domain = 'accounting'),
    'readiness', count(*) FILTER (WHERE domain = 'readiness')
  )
  FROM public.financial_operation_audit
  WHERE tenant_id = _tenant_id;
$$;
GRANT EXECUTE ON FUNCTION public.financial_audit_summary(uuid) TO authenticated;

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
