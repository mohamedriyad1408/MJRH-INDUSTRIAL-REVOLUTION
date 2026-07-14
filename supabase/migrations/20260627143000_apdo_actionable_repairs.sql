-- MJRH V2 — Make APDO actionable and repairable
-- Date: 2026-06-27
-- APDO rows must be repairable: branch/cash/journal/notification are inferred and linked where possible.

CREATE OR REPLACE FUNCTION public.apdo_event_href(_source_type text, _source_id uuid, _data jsonb DEFAULT '{}'::jsonb)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN _source_type = 'order' AND _source_id IS NOT NULL THEN '/orders/' || _source_id::text
    WHEN _source_type = 'service_unit' AND (_data->>'order_id') IS NOT NULL THEN '/orders/' || (_data->>'order_id')
    WHEN _source_type IN ('expense','payroll_line','payroll_payment','employee_advance','manual_cash_transaction','cash_transfer','cash_account') THEN '/accounting'
    WHEN _source_type IN ('inventory_item','inventory_movement') THEN '/inventory'
    WHEN _source_type = 'pickup_request' THEN '/live-map'
    ELSE '/system-health'
  END
$$;

CREATE OR REPLACE FUNCTION public.record_operation_event(
  _process_key text,
  _process_name text,
  _source_type text,
  _source_id uuid DEFAULT NULL,
  _branch_id uuid DEFAULT NULL,
  _cash_account_id uuid DEFAULT NULL,
  _journal_entry_id uuid DEFAULT NULL,
  _report_bucket text DEFAULT 'operational',
  _requires_notification boolean DEFAULT false,
  _notification_id uuid DEFAULT NULL,
  _data jsonb DEFAULT '{}'::jsonb,
  _output jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid uuid;
  eid uuid;
  nid uuid := _notification_id;
  notification_prepared boolean := COALESCE((_output->>'notification_prepared')::boolean, false);
BEGIN
  tid := COALESCE(public.current_tenant_id(), (_data->>'tenant_id')::uuid);
  IF tid IS NULL THEN RAISE EXCEPTION 'Tenant is required'; END IF;
  IF NOT (public.is_privileged_context() OR public.can_access_branch(tid, _branch_id) OR public.is_tenant_member(auth.uid(), tid)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- If an internal notification is explicitly required and no external notification was prepared,
  -- create it now instead of leaving APDO with an unfixable "notification missing" row.
  IF COALESCE(_requires_notification, false) AND nid IS NULL AND NOT notification_prepared THEN
    INSERT INTO public.app_notifications(tenant_id, branch_id, audience, title, body, href, tone)
    VALUES (
      tid,
      _branch_id,
      'owner',
      COALESCE(NULLIF(_process_name, ''), 'تنبيه تشغيل'),
      COALESCE(_data->>'reason', _data->>'message', _data->>'order_number', 'عملية تحتاج متابعة'),
      public.apdo_event_href(_source_type, _source_id, _data),
      CASE WHEN COALESCE((_output->>'cash_impact')::boolean, false) OR COALESCE((_output->>'journal_required')::boolean, false) THEN 'warning' ELSE 'info' END
    ) RETURNING id INTO nid;
  END IF;

  INSERT INTO public.operation_events(
    tenant_id, branch_id, actor_id, process_key, process_name, source_type, source_id,
    cash_account_id, journal_entry_id, report_bucket, requires_notification, notification_id,
    notification_created, data, output
  ) VALUES (
    tid, _branch_id, auth.uid(), _process_key, _process_name, _source_type, _source_id,
    _cash_account_id, _journal_entry_id, COALESCE(_report_bucket, 'operational'), COALESCE(_requires_notification, false), nid,
    (nid IS NOT NULL OR notification_prepared), COALESCE(_data, '{}'::jsonb), COALESCE(_output, '{}'::jsonb)
  ) RETURNING id INTO eid;
  RETURN eid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_operation_event(text,text,text,uuid,uuid,uuid,uuid,text,boolean,uuid,jsonb,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.repair_operation_event_apdo(_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e record;
  bid uuid;
  cash_id uuid;
  jid uuid;
  nid uuid;
  href text;
  fixed text[] := ARRAY[]::text[];
  transfer_id uuid;
  order_id uuid;
  expense_id uuid;
BEGIN
  SELECT * INTO e FROM public.operation_events WHERE id = _event_id;
  IF e.id IS NULL THEN RAISE EXCEPTION 'عملية APDO غير موجودة'; END IF;
  IF NOT (public.is_privileged_context() OR public.is_tenant_manager(auth.uid(), e.tenant_id) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  bid := e.branch_id;
  cash_id := e.cash_account_id;
  jid := e.journal_entry_id;
  nid := e.notification_id;
  href := public.apdo_event_href(e.source_type, e.source_id, e.data);

  -- Infer branch from source.
  IF bid IS NULL THEN
    IF e.source_type = 'order' AND e.source_id IS NOT NULL THEN
      SELECT branch_id INTO bid FROM public.orders WHERE id = e.source_id;
    ELSIF e.source_type = 'service_unit' AND e.source_id IS NOT NULL THEN
      SELECT o.branch_id INTO bid FROM public.service_units su JOIN public.orders o ON o.id = su.order_id WHERE su.id = e.source_id;
    ELSIF e.source_type = 'expense' AND e.source_id IS NOT NULL THEN
      SELECT branch_id INTO bid FROM public.expenses WHERE id = e.source_id;
    ELSIF e.source_type IN ('payroll_line','payroll_payment') AND e.source_id IS NOT NULL THEN
      SELECT emp.branch_id INTO bid FROM public.payroll_lines pl LEFT JOIN public.employees emp ON emp.id = pl.employee_id WHERE pl.id = e.source_id;
    ELSIF e.source_type IN ('manual_cash_transaction','cash_transaction') AND e.source_id IS NOT NULL THEN
      SELECT ca.branch_id INTO bid FROM public.cash_transactions ct JOIN public.cash_accounts ca ON ca.id = ct.cash_account_id WHERE ct.id = e.source_id;
    ELSIF e.source_type = 'cash_transfer' THEN
      SELECT ca.branch_id INTO bid
      FROM public.cash_transactions ct
      JOIN public.cash_accounts ca ON ca.id = ct.cash_account_id
      WHERE ct.tenant_id = e.tenant_id
        AND ct.source_type = 'cash_transfer'
        AND (
          (e.source_id IS NOT NULL AND ct.source_id = e.source_id)
          OR (e.data->>'from_cash_account_id' IS NOT NULL AND ct.cash_account_id = (e.data->>'from_cash_account_id')::uuid)
        )
      ORDER BY ABS(EXTRACT(EPOCH FROM (ct.created_at - e.created_at)))
      LIMIT 1;
    END IF;

    IF bid IS NULL THEN bid := public.default_branch_id_for(e.tenant_id); END IF;
    IF bid IS NOT NULL THEN fixed := fixed || 'branch'; END IF;
  END IF;

  -- Infer/link cash account if cash is expected.
  IF cash_id IS NULL AND COALESCE((e.output->>'cash_impact')::boolean, false) THEN
    IF e.source_type = 'order' AND e.source_id IS NOT NULL THEN
      SELECT cash_account_id INTO cash_id FROM public.cash_transactions WHERE tenant_id = e.tenant_id AND source_type IN ('order_payment','driver_tip') AND source_id = e.source_id AND status = 'posted' ORDER BY created_at DESC LIMIT 1;
    ELSIF e.source_type = 'expense' AND e.source_id IS NOT NULL THEN
      SELECT cash_account_id INTO cash_id FROM public.expenses WHERE id = e.source_id;
    ELSIF e.source_type IN ('payroll_line','payroll_payment') AND e.source_id IS NOT NULL THEN
      SELECT cash_account_id INTO cash_id FROM public.cash_transactions WHERE tenant_id = e.tenant_id AND source_type = 'payroll_payment' AND source_id = e.source_id AND status = 'posted' ORDER BY created_at DESC LIMIT 1;
    ELSIF e.source_type = 'manual_cash_transaction' AND e.source_id IS NOT NULL THEN
      SELECT cash_account_id INTO cash_id FROM public.cash_transactions WHERE id = e.source_id;
    ELSIF e.source_type = 'cash_transfer' THEN
      SELECT cash_account_id, source_id INTO cash_id, transfer_id
      FROM public.cash_transactions
      WHERE tenant_id = e.tenant_id
        AND source_type = 'cash_transfer'
        AND direction = 'out'
        AND (
          (e.source_id IS NOT NULL AND source_id = e.source_id)
          OR (e.data->>'from_cash_account_id' IS NOT NULL AND cash_account_id = (e.data->>'from_cash_account_id')::uuid)
        )
      ORDER BY ABS(EXTRACT(EPOCH FROM (created_at - e.created_at)))
      LIMIT 1;
      IF e.source_id IS NULL AND transfer_id IS NOT NULL THEN
        UPDATE public.operation_events SET source_id = transfer_id WHERE id = e.id;
        e.source_id := transfer_id;
      END IF;
    END IF;

    IF cash_id IS NULL THEN cash_id := public.pick_cash_account_for_expense(e.tenant_id, bid, NULL); END IF;
    IF cash_id IS NOT NULL THEN fixed := fixed || 'cash'; END IF;
  END IF;

  -- Run source-specific accounting sync if a journal is expected.
  IF COALESCE((e.output->>'journal_required')::boolean, false) THEN
    BEGIN
      IF e.source_type = 'order' AND e.source_id IS NOT NULL THEN
        PERFORM public.sync_order_financials(e.source_id);
      ELSIF e.source_type = 'expense' AND e.source_id IS NOT NULL THEN
        PERFORM public.sync_expense_financials(e.source_id);
      ELSIF e.source_type IN ('payroll_line','payroll_payment') AND e.source_id IS NOT NULL THEN
        PERFORM public.sync_payroll_payment_journal(e.source_id);
      ELSIF e.source_type = 'manual_cash_transaction' AND e.source_id IS NOT NULL THEN
        PERFORM public.sync_manual_cash_transaction_journal(e.source_id);
      ELSIF e.source_type = 'employee_advance' AND e.source_id IS NOT NULL THEN
        SELECT id INTO expense_id FROM public.expenses WHERE tenant_id = e.tenant_id AND source_type = 'employee_advance' AND source_id = e.source_id LIMIT 1;
        IF expense_id IS NOT NULL THEN PERFORM public.sync_expense_financials(expense_id); END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Keep repair best-effort; details remain visible in APDO.
      NULL;
    END;
  END IF;

  -- Link a journal that may use a business source_type different from APDO source_type.
  IF jid IS NULL AND COALESCE((e.output->>'journal_required')::boolean, false) THEN
    IF e.source_type = 'order' AND e.source_id IS NOT NULL THEN
      SELECT id INTO jid FROM public.journal_entries WHERE tenant_id = e.tenant_id AND source_id = e.source_id AND source_type IN ('order_payment','order_receivable','driver_tip') AND status <> 'void' ORDER BY created_at DESC LIMIT 1;
    ELSIF e.source_type = 'expense' AND e.source_id IS NOT NULL THEN
      SELECT id INTO jid FROM public.journal_entries WHERE tenant_id = e.tenant_id AND source_id = e.source_id AND source_type IN ('expense_payment','expense_payable') AND status <> 'void' ORDER BY created_at DESC LIMIT 1;
    ELSIF e.source_type = 'payroll_line' AND e.source_id IS NOT NULL THEN
      SELECT je.id INTO jid
      FROM public.payroll_lines pl
      JOIN public.expenses ex ON ex.id = pl.expense_id
      JOIN public.journal_entries je ON je.source_id = ex.id AND je.source_type = 'expense_payable' AND je.status <> 'void'
      WHERE pl.id = e.source_id
      ORDER BY je.created_at DESC LIMIT 1;
    ELSIF e.source_type = 'payroll_payment' AND e.source_id IS NOT NULL THEN
      SELECT id INTO jid FROM public.journal_entries WHERE tenant_id = e.tenant_id AND source_id = e.source_id AND source_type = 'payroll_payment' AND status <> 'void' ORDER BY created_at DESC LIMIT 1;
    ELSIF e.source_type = 'employee_advance' AND e.source_id IS NOT NULL THEN
      SELECT je.id INTO jid
      FROM public.expenses ex
      JOIN public.journal_entries je ON je.source_id = ex.id AND je.source_type IN ('expense_payment','expense_payable') AND je.status <> 'void'
      WHERE ex.tenant_id = e.tenant_id AND ex.source_type = 'employee_advance' AND ex.source_id = e.source_id
      ORDER BY je.created_at DESC LIMIT 1;
    ELSIF e.source_type = 'manual_cash_transaction' AND e.source_id IS NOT NULL THEN
      SELECT id INTO jid FROM public.journal_entries WHERE tenant_id = e.tenant_id AND source_id = e.source_id AND source_type = 'manual_cash_transaction' AND status <> 'void' ORDER BY created_at DESC LIMIT 1;
    ELSIF e.source_type = 'cash_transfer' AND e.source_id IS NOT NULL THEN
      SELECT id INTO jid FROM public.journal_entries WHERE tenant_id = e.tenant_id AND source_id = e.source_id AND source_type = 'cash_transfer' AND status <> 'void' ORDER BY created_at DESC LIMIT 1;
    END IF;
    IF jid IS NOT NULL THEN fixed := fixed || 'journal'; END IF;
  END IF;

  -- Create or link missing internal notification when required and no external/customer notification was prepared.
  IF e.requires_notification AND nid IS NULL AND NOT COALESCE((e.output->>'notification_prepared')::boolean, false) THEN
    INSERT INTO public.app_notifications(tenant_id, branch_id, audience, title, body, href, tone)
    VALUES (
      e.tenant_id,
      bid,
      'owner',
      e.process_name,
      COALESCE(e.data->>'reason', e.data->>'message', e.data->>'order_number', 'عملية تحتاج متابعة'),
      href,
      CASE WHEN COALESCE((e.output->>'journal_required')::boolean, false) OR COALESCE((e.output->>'cash_impact')::boolean, false) THEN 'warning' ELSE 'info' END
    ) RETURNING id INTO nid;
    fixed := fixed || 'notification';
  END IF;

  UPDATE public.operation_events
  SET branch_id = COALESCE(bid, branch_id),
      cash_account_id = COALESCE(cash_id, cash_account_id),
      journal_entry_id = COALESCE(jid, journal_entry_id),
      notification_id = COALESCE(nid, notification_id),
      notification_created = COALESCE(nid, notification_id) IS NOT NULL OR COALESCE((output->>'notification_prepared')::boolean, false),
      report_bucket = COALESCE(NULLIF(report_bucket, ''), 'system/apdo')
  WHERE id = e.id;

  RETURN jsonb_build_object('ok', true, 'fixed', fixed, 'href', href);
END;
$$;
GRANT EXECUTE ON FUNCTION public.repair_operation_event_apdo(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.repair_operation_events_apdo(_tenant_id uuid DEFAULT public.current_tenant_id(), _max_items integer DEFAULT 200)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  fixed_count integer := 0;
  err_count integer := 0;
  res jsonb;
BEGIN
  IF _tenant_id IS NULL THEN RAISE EXCEPTION 'Tenant is required'; END IF;
  IF NOT (public.is_privileged_context() OR public.is_tenant_manager(auth.uid(), _tenant_id) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  FOR r IN
    SELECT id
    FROM public.operation_answer_matrix
    WHERE tenant_id = _tenant_id
      AND (
        branch_answer <> 'answered'
        OR cash_answer = 'missing_cash_account'
        OR journal_answer = 'missing_journal'
        OR report_answer <> 'answered'
        OR notification_answer = 'missing_notification'
      )
    ORDER BY created_at DESC
    LIMIT GREATEST(1, COALESCE(_max_items, 200))
  LOOP
    BEGIN
      res := public.repair_operation_event_apdo(r.id);
      fixed_count := fixed_count + 1;
    EXCEPTION WHEN OTHERS THEN
      err_count := err_count + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('fixed', fixed_count, 'errors', err_count);
END;
$$;
GRANT EXECUTE ON FUNCTION public.repair_operation_events_apdo(uuid,integer) TO authenticated;

-- Smarter APDO matrix: journals may use business source types different from operation_events.source_type.
CREATE OR REPLACE VIEW public.operation_answer_matrix AS
WITH linked AS (
  SELECT
    oe.*,
    COALESCE(
      oe.journal_entry_id,
      CASE
        WHEN oe.source_type = 'order' THEN (
          SELECT je.id FROM public.journal_entries je
          WHERE je.tenant_id = oe.tenant_id AND je.source_id = oe.source_id AND je.source_type IN ('order_payment','order_receivable','driver_tip') AND je.status <> 'void'
          ORDER BY je.created_at DESC LIMIT 1
        )
        WHEN oe.source_type = 'expense' THEN (
          SELECT je.id FROM public.journal_entries je
          WHERE je.tenant_id = oe.tenant_id AND je.source_id = oe.source_id AND je.source_type IN ('expense_payment','expense_payable') AND je.status <> 'void'
          ORDER BY je.created_at DESC LIMIT 1
        )
        WHEN oe.source_type = 'payroll_line' THEN (
          SELECT je.id
          FROM public.payroll_lines pl
          JOIN public.expenses ex ON ex.id = pl.expense_id
          JOIN public.journal_entries je ON je.source_id = ex.id AND je.source_type = 'expense_payable' AND je.status <> 'void'
          WHERE pl.id = oe.source_id
          ORDER BY je.created_at DESC LIMIT 1
        )
        WHEN oe.source_type = 'payroll_payment' THEN (
          SELECT je.id FROM public.journal_entries je
          WHERE je.tenant_id = oe.tenant_id AND je.source_id = oe.source_id AND je.source_type = 'payroll_payment' AND je.status <> 'void'
          ORDER BY je.created_at DESC LIMIT 1
        )
        WHEN oe.source_type = 'cash_transfer' THEN (
          SELECT je.id FROM public.journal_entries je
          WHERE je.tenant_id = oe.tenant_id
            AND je.source_type = 'cash_transfer'
            AND (
              je.source_id = oe.source_id
              OR EXISTS (
                SELECT 1 FROM public.cash_transactions ct
                WHERE ct.source_type = 'cash_transfer'
                  AND ct.source_id = je.source_id
                  AND oe.data->>'from_cash_account_id' IS NOT NULL
                  AND ct.cash_account_id = (oe.data->>'from_cash_account_id')::uuid
              )
            )
            AND je.status <> 'void'
          ORDER BY je.created_at DESC LIMIT 1
        )
        WHEN oe.source_type = 'manual_cash_transaction' THEN (
          SELECT je.id FROM public.journal_entries je
          WHERE je.tenant_id = oe.tenant_id AND je.source_id = oe.source_id AND je.source_type = 'manual_cash_transaction' AND je.status <> 'void'
          ORDER BY je.created_at DESC LIMIT 1
        )
        ELSE NULL
      END
    ) AS linked_journal_id
  FROM public.operation_events oe
)
SELECT
  l.id,
  l.created_at,
  l.tenant_id,
  l.branch_id,
  b.name AS branch_name,
  l.actor_id,
  l.process_key,
  l.process_name,
  l.source_type,
  l.source_id,
  l.cash_account_id,
  ca.name AS cash_account_name,
  l.linked_journal_id AS journal_entry_id,
  l.report_bucket,
  l.notification_id,
  l.requires_notification,
  CASE WHEN l.branch_id IS NOT NULL THEN 'answered' ELSE 'missing_branch' END AS branch_answer,
  CASE WHEN l.cash_account_id IS NOT NULL THEN 'answered' WHEN COALESCE((l.output->>'cash_impact')::boolean, false) = false THEN 'not_applicable' ELSE 'missing_cash_account' END AS cash_answer,
  CASE WHEN l.linked_journal_id IS NOT NULL THEN 'answered' WHEN COALESCE((l.output->>'journal_required')::boolean, false) = false THEN 'not_applicable' ELSE 'missing_journal' END AS journal_answer,
  CASE WHEN l.report_bucket IS NOT NULL AND l.report_bucket <> '' THEN 'answered' ELSE 'missing_report_bucket' END AS report_answer,
  CASE
    WHEN l.requires_notification = false THEN 'not_required'
    WHEN l.notification_id IS NOT NULL OR COALESCE((l.output->>'notification_prepared')::boolean, false) THEN 'answered'
    ELSE 'missing_notification'
  END AS notification_answer,
  l.data,
  l.output
FROM linked l
LEFT JOIN public.branches b ON b.id = l.branch_id
LEFT JOIN public.cash_accounts ca ON ca.id = l.cash_account_id;

GRANT SELECT ON public.operation_answer_matrix TO authenticated;

-- Repair existing recent rows now so the current screen is not a dead list of unfixable warnings.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT tenant_id FROM public.operation_events LOOP
    BEGIN
      PERFORM public.repair_operation_events_apdo(r.tenant_id, 300);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;
