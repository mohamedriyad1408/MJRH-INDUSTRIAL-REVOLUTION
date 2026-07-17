-- MJRH V2 — Present ironing technicians distribution + ironing base value
-- Date: 2026-06-27
-- Rules:
-- 1) Ironing work is assigned only to checked-in ironing technicians.
-- 2) When a technician checks in/out, uncompleted ironing pieces are rebalanced among currently present technicians.
-- 3) Daily ironing payout is calculated from the equivalent ironing value of the item, even when the order item was cleaning.

ALTER TABLE public.service_units
  ADD COLUMN IF NOT EXISTS ironing_base_value numeric(10,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS service_units_ironing_base_value_idx ON public.service_units(tenant_id, ironing_base_value);

CREATE OR REPLACE FUNCTION public.normalize_laundry_item_name(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(regexp_replace(
    regexp_replace(lower(coalesce(_name, '')),
      '(مكوي|مكوية|كي|كوي|غسيل|غسل|تنظيف|دراي|دراى|dry clean|dry-clean|dryclean|cleaning|clean|wash|washing|ironing|iron|pressed|press)',
      '', 'gi'),
    '\s+', ' ', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.estimate_ironing_base_value(
  _tenant_id uuid,
  _name text,
  _garment_type text DEFAULT NULL,
  _fallback numeric DEFAULT 0
) RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key1 text := public.normalize_laundry_item_name(COALESCE(_garment_type, _name));
  key2 text := public.normalize_laundry_item_name(_name);
  v numeric;
BEGIN
  SELECT si.unit_price INTO v
  FROM public.service_items si
  WHERE si.tenant_id = _tenant_id
    AND si.is_active = true
    AND si.service_type = 'ironing'
    AND (
      public.normalize_laundry_item_name(si.name) = key1
      OR public.normalize_laundry_item_name(si.name) = key2
      OR key1 <> '' AND public.normalize_laundry_item_name(si.name) LIKE '%' || key1 || '%'
      OR key2 <> '' AND public.normalize_laundry_item_name(si.name) LIKE '%' || key2 || '%'
      OR key1 <> '' AND key1 LIKE '%' || public.normalize_laundry_item_name(si.name) || '%'
      OR key2 <> '' AND key2 LIKE '%' || public.normalize_laundry_item_name(si.name) || '%'
    )
  ORDER BY
    CASE
      WHEN public.normalize_laundry_item_name(si.name) = key1 THEN 0
      WHEN public.normalize_laundry_item_name(si.name) = key2 THEN 1
      ELSE 2
    END,
    length(si.name)
  LIMIT 1;

  RETURN COALESCE(NULLIF(v, 0), NULLIF(_fallback, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_service_unit_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ord_no integer;
  ord_tenant uuid;
  next_no integer;
BEGIN
  SELECT order_number, tenant_id INTO ord_no, ord_tenant
  FROM public.orders
  WHERE id = NEW.order_id;

  IF NEW.tenant_id IS NULL THEN NEW.tenant_id := ord_tenant; END IF;

  IF NEW.unit_number IS NULL THEN
    SELECT COALESCE(MAX(unit_number), 0) + 1 INTO next_no
    FROM public.service_units
    WHERE order_id = NEW.order_id;
    NEW.unit_number := next_no;
  END IF;

  IF NEW.name IS NULL OR length(trim(NEW.name)) = 0 THEN NEW.name := COALESCE(NEW.garment_type, 'قطعة'); END IF;
  IF NEW.garment_type IS NULL OR length(trim(NEW.garment_type)) = 0 THEN NEW.garment_type := NEW.name; END IF;

  IF NEW.label_code IS NULL OR length(trim(NEW.label_code)) = 0 THEN
    NEW.label_code := '#' || COALESCE(ord_no::text, 'ORD') || '-' || lpad(NEW.unit_number::text, 2, '0');
  END IF;
  IF NEW.qr_code IS NULL OR length(trim(NEW.qr_code)) = 0 THEN NEW.qr_code := NEW.label_code; END IF;

  IF NEW.is_shirt_like IS NULL THEN
    NEW.is_shirt_like := NEW.name ILIKE '%قميص%'
      OR NEW.name ILIKE '%بلوز%'
      OR NEW.name ILIKE '%shirt%'
      OR NEW.name ILIKE '%blouse%';
  END IF;

  -- Always calculate the equivalent ironing value for payout/fair distribution.
  NEW.ironing_base_value := public.estimate_ironing_base_value(
    NEW.tenant_id,
    NEW.name,
    NEW.garment_type,
    CASE WHEN NEW.service_type IN ('ironing','both') THEN COALESCE(NEW.line_value, NEW.unit_price, 0) ELSE 0 END
  );

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.present_ironing_employees(_tenant_id uuid, _branch_id uuid DEFAULT NULL)
RETURNS TABLE(employee_id uuid, full_name text, branch_id uuid, check_in_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.full_name, e.branch_id, max(a.check_in_at) AS check_in_at
  FROM public.employees e
  JOIN public.employee_attendance a ON a.employee_id = e.id
  WHERE e.tenant_id = _tenant_id
    AND e.is_active = true
    AND (e.station = 'ironing' OR e.job_role::text = 'ironing_tech')
    AND (_branch_id IS NULL OR e.branch_id = _branch_id)
    AND a.check_out_at IS NULL
    AND a.work_date = CURRENT_DATE
  GROUP BY e.id, e.full_name, e.branch_id
  ORDER BY max(a.check_in_at), e.full_name
$$;

CREATE OR REPLACE FUNCTION public.rebalance_ironing_assignments(
  _order_id uuid DEFAULT NULL,
  _tenant_id uuid DEFAULT NULL,
  _branch_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid uuid;
  bid uuid;
  emp_count integer := 0;
  assigned_count integer := 0;
  u record;
  chosen uuid;
BEGIN
  IF _order_id IS NOT NULL THEN
    SELECT tenant_id, branch_id INTO tid, bid FROM public.orders WHERE id = _order_id;
  END IF;
  tid := COALESCE(tid, _tenant_id, public.current_tenant_id());
  bid := COALESCE(_branch_id, bid);
  IF tid IS NULL THEN RAISE EXCEPTION 'Tenant is required'; END IF;

  IF NOT (public.is_privileged_context() OR public.can_access_tenant(tid)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  DROP TABLE IF EXISTS pg_temp.ironing_loads;
  CREATE TEMP TABLE ironing_loads ON COMMIT DROP AS
  SELECT
    pe.employee_id,
    pe.full_name,
    0::integer AS open_pieces,
    COALESCE(done.done_pieces, 0)::integer AS done_pieces,
    COALESCE(done.done_value, 0)::numeric AS done_value,
    COALESCE(done.done_pieces, 0) * 100 + COALESCE(done.done_value, 0) * 0.7 AS score
  FROM public.present_ironing_employees(tid, bid) pe
  LEFT JOIN LATERAL (
    SELECT COUNT(su.id)::int AS done_pieces,
           COALESCE(SUM(COALESCE(NULLIF(su.ironing_base_value,0), su.line_value, su.unit_price, 0)),0)::numeric AS done_value
    FROM public.service_units su
    WHERE su.assigned_ironing_employee_id = pe.employee_id
      AND su.ironing_completed_at::date = CURRENT_DATE
  ) done ON true;

  SELECT count(*) INTO emp_count FROM pg_temp.ironing_loads;

  -- Reset uncompleted ironing work that belongs to absent technicians or needs fair redistribution.
  UPDATE public.service_units su
  SET assigned_ironing_employee_id = NULL,
      ironing_assigned_at = NULL,
      updated_at = now()
  FROM public.orders o
  WHERE o.id = su.order_id
    AND o.tenant_id = tid
    AND (bid IS NULL OR o.branch_id = bid)
    AND (_order_id IS NULL OR o.id = _order_id)
    AND o.status NOT IN ('delivered','cancelled')
    AND su.status <> 'cancelled'
    AND su.current_stage IN ('ironing','ironing_done')
    AND su.ironing_completed_at IS NULL
    AND COALESCE(su.needs_reclean,false) = false
    AND su.service_type IN ('cleaning','ironing','both');

  IF emp_count = 0 THEN
    RETURN jsonb_build_object('assigned', 0, 'employees', 0, 'message', 'لا يوجد فني كي حاضر الآن');
  END IF;

  FOR u IN
    SELECT su.id,
           COALESCE(NULLIF(su.ironing_base_value,0), su.line_value, su.unit_price, 0)::numeric AS val,
           COALESCE(su.is_shirt_like,false) AS shirt_like
    FROM public.service_units su
    JOIN public.orders o ON o.id = su.order_id
    WHERE o.tenant_id = tid
      AND (bid IS NULL OR o.branch_id = bid)
      AND (_order_id IS NULL OR o.id = _order_id)
      AND o.status NOT IN ('delivered','cancelled')
      AND su.status <> 'cancelled'
      AND su.current_stage IN ('ironing','ironing_done')
      AND su.ironing_completed_at IS NULL
      AND COALESCE(su.needs_reclean,false) = false
      AND su.service_type IN ('cleaning','ironing','both')
      AND su.assigned_ironing_employee_id IS NULL
    ORDER BY (CASE WHEN COALESCE(su.is_shirt_like,false) THEN 1000 ELSE 0 END) + COALESCE(NULLIF(su.ironing_base_value,0), su.line_value, su.unit_price, 0) DESC,
             su.created_at
  LOOP
    SELECT employee_id INTO chosen
    FROM pg_temp.ironing_loads
    ORDER BY score, done_pieces + open_pieces, check_in_at NULLS LAST
    LIMIT 1;

    UPDATE public.service_units
    SET assigned_ironing_employee_id = chosen,
        ironing_assigned_at = now(),
        updated_at = now()
    WHERE id = u.id;

    UPDATE pg_temp.ironing_loads
    SET open_pieces = open_pieces + 1,
        score = score + 100 + (CASE WHEN u.shirt_like THEN 65 ELSE 0 END) + (u.val * 0.7)
    WHERE employee_id = chosen;

    assigned_count := assigned_count + 1;
  END LOOP;

  RETURN jsonb_build_object('assigned', assigned_count, 'employees', emp_count);
END;
$$;
GRANT EXECUTE ON FUNCTION public.rebalance_ironing_assignments(uuid,uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rebalance_ironing_on_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e record;
BEGIN
  SELECT * INTO e FROM public.employees WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);
  IF e.id IS NOT NULL AND (e.station = 'ironing' OR e.job_role::text = 'ironing_tech') THEN
    PERFORM public.rebalance_ironing_assignments(NULL, e.tenant_id, e.branch_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_rebalance_ironing_attendance_ins ON public.employee_attendance;
CREATE TRIGGER trg_rebalance_ironing_attendance_ins
AFTER INSERT ON public.employee_attendance
FOR EACH ROW EXECUTE FUNCTION public.rebalance_ironing_on_attendance();

DROP TRIGGER IF EXISTS trg_rebalance_ironing_attendance_upd ON public.employee_attendance;
CREATE TRIGGER trg_rebalance_ironing_attendance_upd
AFTER UPDATE OF check_out_at ON public.employee_attendance
FOR EACH ROW EXECUTE FUNCTION public.rebalance_ironing_on_attendance();

-- Update payout to use ironing_base_value.
CREATE OR REPLACE FUNCTION public.pay_daily_ironing_workers(_work_date date DEFAULT CURRENT_DATE, _cash_account_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid uuid;
  cash_id uuid;
  r record;
  pct numeric;
  amount_due numeric;
  payout_id uuid;
  exp_id uuid;
  tx_id uuid;
  rows_count int := 0;
  total_amount numeric := 0;
BEGIN
  tid := public.current_tenant_id();
  IF tid IS NULL THEN RAISE EXCEPTION 'No tenant'; END IF;
  cash_id := COALESCE(_cash_account_id, public.ensure_default_cash_account_for(tid));

  FOR r IN
    SELECT
      e.id AS employee_id,
      e.full_name,
      COUNT(su.id)::int AS pieces_count,
      COALESCE(SUM(COALESCE(NULLIF(su.ironing_base_value,0), su.line_value, su.unit_price, 0)),0)::numeric AS work_value
    FROM public.employees e
    JOIN public.service_units su ON su.assigned_ironing_employee_id = e.id
    WHERE e.tenant_id = tid
      AND e.is_active = true
      AND (e.station = 'ironing' OR e.job_role::text = 'ironing_tech')
      AND su.ironing_completed_at::date = _work_date
    GROUP BY e.id, e.full_name
    HAVING COUNT(su.id) > 0
  LOOP
    SELECT COALESCE(ir.percentage, COALESCE(e.commission_percent,0)) INTO pct
    FROM public.employees e
    LEFT JOIN LATERAL (
      SELECT percentage FROM public.ironing_rates
      WHERE tenant_id = tid AND employee_id = r.employee_id AND effective_from <= _work_date
      ORDER BY effective_from DESC
      LIMIT 1
    ) ir ON true
    WHERE e.id = r.employee_id;

    pct := COALESCE(pct, 0);
    amount_due := ROUND(r.work_value * pct / 100.0, 2);
    IF amount_due <= 0 THEN CONTINUE; END IF;

    INSERT INTO public.ironing_daily_payouts(tenant_id, employee_id, payout_date, pieces_count, work_value, percentage, amount, status, paid_at, paid_by, notes)
    VALUES (tid, r.employee_id, _work_date, r.pieces_count, r.work_value, pct, amount_due, 'paid', now(), auth.uid(), 'صرف يومية كي تلقائي حسب قيمة الكي المرجعية')
    ON CONFLICT (tenant_id, employee_id, payout_date)
    DO UPDATE SET pieces_count = EXCLUDED.pieces_count,
                  work_value = EXCLUDED.work_value,
                  percentage = EXCLUDED.percentage,
                  amount = EXCLUDED.amount,
                  status = CASE WHEN public.ironing_daily_payouts.status = 'void' THEN 'void' ELSE 'paid' END,
                  paid_at = COALESCE(public.ironing_daily_payouts.paid_at, now()),
                  paid_by = COALESCE(public.ironing_daily_payouts.paid_by, auth.uid()),
                  updated_at = now()
    RETURNING id INTO payout_id;

    INSERT INTO public.expenses(tenant_id, category, amount, description, spent_at, status, employee_id, source_type, source_id, paid_at, created_by)
    VALUES (tid, 'salaries', amount_due, 'صرف يومية كي: ' || r.full_name || ' يوم ' || _work_date::text, _work_date::timestamptz, 'paid', r.employee_id, 'ironing_daily_payout', payout_id, now(), auth.uid())
    ON CONFLICT (tenant_id, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL
    DO UPDATE SET amount = EXCLUDED.amount,
                  description = EXCLUDED.description,
                  status = 'paid',
                  paid_at = COALESCE(public.expenses.paid_at, now())
    RETURNING id INTO exp_id;

    INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at, created_by)
    VALUES (tid, cash_id, 'out', amount_due, 'ironing_daily_payout', payout_id, 'صرف يومية كي: ' || r.full_name, now(), auth.uid())
    ON CONFLICT (tenant_id, source_type, source_id, direction) WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void'
    DO NOTHING
    RETURNING id INTO tx_id;

    INSERT INTO public.employee_financial_ledger(tenant_id, employee_id, entry_type, amount, direction, source_type, source_id, description, entry_at, created_by)
    VALUES (tid, r.employee_id, 'salary_payment', amount_due, 'employee_due', 'ironing_daily_payout', payout_id, 'صرف يومية كي يوم ' || _work_date::text, now(), auth.uid())
    ON CONFLICT (tenant_id, employee_id, entry_type, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;

    UPDATE public.ironing_daily_payouts
    SET expense_id = exp_id, cash_transaction_id = COALESCE(tx_id, cash_transaction_id)
    WHERE id = payout_id;

    rows_count := rows_count + 1;
    total_amount := total_amount + amount_due;
  END LOOP;

  RETURN jsonb_build_object('date', _work_date, 'workers_count', rows_count, 'total_amount', total_amount);
END;
$$;
GRANT EXECUTE ON FUNCTION public.pay_daily_ironing_workers(date, uuid) TO authenticated;

-- Backfill base values and rebalance current open ironing queues.
UPDATE public.service_units su
SET ironing_base_value = public.estimate_ironing_base_value(
  su.tenant_id,
  su.name,
  su.garment_type,
  CASE WHEN su.service_type IN ('ironing','both') THEN COALESCE(su.line_value, su.unit_price, 0) ELSE 0 END
)
WHERE su.tenant_id IS NOT NULL;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, branch_id FROM public.tenants CROSS JOIN LATERAL (SELECT NULL::uuid AS branch_id) x LOOP
    BEGIN
      PERFORM public.rebalance_ironing_assignments(NULL, r.id, NULL);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;
