-- APDO database safety net: record critical operations even if they happen outside the UI.

CREATE OR REPLACE FUNCTION public.apdo_record_cash_closing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.record_operation_event(
    'cash_closing', 'إقفال خزنة', 'daily_cash_closing', NEW.id, NEW.branch_id, NEW.cash_account_id, NULL,
    'cash-closing', ABS(COALESCE(NEW.difference,0)) >= 0.01, NULL,
    jsonb_build_object('tenant_id', NEW.tenant_id, 'closing_date', NEW.closing_date, 'expected_balance', NEW.expected_balance, 'counted_balance', NEW.counted_balance, 'difference', NEW.difference),
    jsonb_build_object('cash_impact', false, 'journal_required', ABS(COALESCE(NEW.difference,0)) >= 0.01, 'appears_in_report', true)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apdo_cash_closing_insert ON public.daily_cash_closings;
CREATE TRIGGER trg_apdo_cash_closing_insert
AFTER INSERT ON public.daily_cash_closings
FOR EACH ROW EXECUTE FUNCTION public.apdo_record_cash_closing();

CREATE OR REPLACE FUNCTION public.apdo_record_pickup_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_operation_event(
      'pickup_created', 'إنشاء طلب استلام', 'pickup_request', NEW.id, NEW.branch_id, NULL, NULL,
      'delivery/pickups', false, NULL,
      jsonb_build_object('tenant_id', NEW.tenant_id, 'customer_name', NEW.customer_name, 'phone', NEW.phone, 'scheduled_at', NEW.scheduled_at),
      jsonb_build_object('cash_impact', false, 'journal_required', false, 'appears_in_report', true)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.driver_employee_id IS NOT NULL AND NEW.driver_employee_id IS DISTINCT FROM OLD.driver_employee_id THEN
      PERFORM public.record_operation_event(
        'driver_assigned', 'تعيين مندوب', 'pickup_request', NEW.id, NEW.branch_id, NULL, NULL,
        'delivery/map', false, NULL,
        jsonb_build_object('tenant_id', NEW.tenant_id, 'driver_employee_id', NEW.driver_employee_id, 'status', NEW.status),
        jsonb_build_object('cash_impact', false, 'journal_required', false, 'appears_in_report', true)
      );
    END IF;
    IF NEW.converted_order_id IS NOT NULL AND NEW.converted_order_id IS DISTINCT FROM OLD.converted_order_id THEN
      PERFORM public.record_operation_event(
        'pickup_converted_to_order', 'تحويل الاستلام إلى طلب', 'pickup_request', NEW.id, NEW.branch_id, NULL, NULL,
        'orders/pickups', false, NULL,
        jsonb_build_object('tenant_id', NEW.tenant_id, 'converted_order_id', NEW.converted_order_id, 'driver_employee_id', NEW.driver_employee_id),
        jsonb_build_object('cash_impact', false, 'journal_required', false, 'appears_in_report', true)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apdo_pickup_request_insert ON public.pickup_requests;
CREATE TRIGGER trg_apdo_pickup_request_insert
AFTER INSERT ON public.pickup_requests
FOR EACH ROW EXECUTE FUNCTION public.apdo_record_pickup_request();

DROP TRIGGER IF EXISTS trg_apdo_pickup_request_update ON public.pickup_requests;
CREATE TRIGGER trg_apdo_pickup_request_update
AFTER UPDATE OF driver_employee_id, converted_order_id, status ON public.pickup_requests
FOR EACH ROW EXECUTE FUNCTION public.apdo_record_pickup_request();

CREATE OR REPLACE FUNCTION public.apdo_record_qc_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE bid uuid;
BEGIN
  SELECT branch_id INTO bid FROM public.orders WHERE id = NEW.order_id;
  PERFORM public.record_operation_event(
    CASE WHEN NEW.result = 'passed' THEN 'qc_passed' ELSE 'qc_issue_reported' END,
    CASE WHEN NEW.result = 'passed' THEN 'اجتياز فحص الجودة' ELSE 'تسجيل مشكلة جودة' END,
    'qc_check', NEW.id, bid, NULL, NULL,
    'quality/reports', NEW.result <> 'passed', NULL,
    jsonb_build_object('tenant_id', NEW.tenant_id, 'order_id', NEW.order_id, 'service_unit_id', NEW.service_unit_id, 'result', NEW.result, 'severity', NEW.severity, 'notes', NEW.notes),
    jsonb_build_object('cash_impact', false, 'journal_required', false, 'appears_in_report', true)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apdo_qc_check_insert ON public.qc_checks;
CREATE TRIGGER trg_apdo_qc_check_insert
AFTER INSERT ON public.qc_checks
FOR EACH ROW EXECUTE FUNCTION public.apdo_record_qc_check();
