-- Daily payout for ironing workers: paid at end of day, registered in cash, expenses, and employee ledger.

CREATE TABLE IF NOT EXISTS public.ironing_daily_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  payout_date date NOT NULL DEFAULT CURRENT_DATE,
  pieces_count integer NOT NULL DEFAULT 0,
  work_value numeric(12,2) NOT NULL DEFAULT 0,
  percentage numeric(6,3) NOT NULL DEFAULT 0,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('draft','paid','void')),
  expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  cash_transaction_id uuid REFERENCES public.cash_transactions(id) ON DELETE SET NULL,
  paid_at timestamptz,
  paid_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, employee_id, payout_date)
);
CREATE INDEX IF NOT EXISTS ironing_daily_payouts_tenant_idx ON public.ironing_daily_payouts(tenant_id, payout_date DESC, employee_id);
ALTER TABLE public.ironing_daily_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ironing_daily_payouts_tenant_all ON public.ironing_daily_payouts;
CREATE POLICY ironing_daily_payouts_tenant_all ON public.ironing_daily_payouts
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ironing_daily_payouts TO authenticated;
GRANT ALL ON public.ironing_daily_payouts TO service_role;

DROP TRIGGER IF EXISTS trg_ironing_daily_payouts_upd ON public.ironing_daily_payouts;
CREATE TRIGGER trg_ironing_daily_payouts_upd BEFORE UPDATE ON public.ironing_daily_payouts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

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
      COALESCE(SUM(su.line_value),0)::numeric AS work_value
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
    VALUES (tid, r.employee_id, _work_date, r.pieces_count, r.work_value, pct, amount_due, 'paid', now(), auth.uid(), 'صرف يومية كي تلقائي')
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

-- Replace easy monthly payroll sync: ironing percentage workers are paid daily, so do not add their ironing commission again monthly.
CREATE OR REPLACE FUNCTION public.sync_monthly_payroll_payables(_month date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid uuid;
  p_start date;
  p_end date;
  p_id uuid;
  emp record;
  daily_total numeric;
  commission_total numeric;
  advances_total numeric;
  gross numeric;
  net numeric;
  line_id uuid;
  exp_id uuid;
  rows_count int := 0;
  gross_sum numeric := 0;
  advances_sum numeric := 0;
  net_sum numeric := 0;
BEGIN
  tid := public.current_tenant_id();
  IF tid IS NULL THEN RAISE EXCEPTION 'No tenant'; END IF;

  p_start := date_trunc('month', _month)::date;
  p_end := (date_trunc('month', _month) + interval '1 month - 1 day')::date;

  INSERT INTO public.payroll_periods(tenant_id, period_start, period_end, status)
  VALUES (tid, p_start, p_end, 'draft')
  ON CONFLICT (tenant_id, period_start, period_end)
  DO UPDATE SET updated_at = now()
  RETURNING id INTO p_id;

  FOR emp IN
    SELECT id, full_name, station::text AS station, job_role::text AS job_role,
           COALESCE(monthly_salary,0) AS monthly_salary, COALESCE(commission_percent,0) AS commission_percent
    FROM public.employees
    WHERE tenant_id = tid AND is_active = true
    ORDER BY full_name
  LOOP
    SELECT COALESCE(SUM(amount),0) INTO daily_total
    FROM public.daily_salaries
    WHERE tenant_id = tid AND employee_id = emp.id AND work_date BETWEEN p_start AND p_end;

    -- كي بنظام نسبة يومية لا يتحسب مرة تانية في الشهر.
    IF emp.station = 'ironing' OR emp.job_role = 'ironing_tech' THEN
      commission_total := 0;
    ELSE
      SELECT COALESCE(SUM(line_value),0) * (emp.commission_percent / 100.0) INTO commission_total
      FROM public.service_units
      WHERE tenant_id = tid
        AND assigned_ironing_employee_id = emp.id
        AND ironing_completed_at::date BETWEEN p_start AND p_end;
    END IF;

    SELECT COALESCE(SUM(amount),0) INTO advances_total
    FROM public.employee_requests
    WHERE tenant_id = tid AND employee_id = emp.id AND type = 'advance' AND status = 'approved'
      AND created_at::date BETWEEN p_start AND p_end;

    gross := COALESCE(emp.monthly_salary,0) + COALESCE(daily_total,0) + COALESCE(commission_total,0);
    net := GREATEST(0, gross - COALESCE(advances_total,0));

    IF gross > 0 OR advances_total > 0 THEN
      INSERT INTO public.payroll_lines(tenant_id, payroll_period_id, employee_id, base_salary, daily_salary, commission_amount, gross_pay, advances_deducted, net_pay, status, notes)
      VALUES (tid, p_id, emp.id, emp.monthly_salary, daily_total, commission_total, gross, advances_total, net, 'posted', 'توليد تلقائي من النظام')
      ON CONFLICT (payroll_period_id, employee_id)
      DO UPDATE SET base_salary = EXCLUDED.base_salary,
                    daily_salary = EXCLUDED.daily_salary,
                    commission_amount = EXCLUDED.commission_amount,
                    gross_pay = EXCLUDED.gross_pay,
                    advances_deducted = EXCLUDED.advances_deducted,
                    net_pay = EXCLUDED.net_pay,
                    status = CASE WHEN public.payroll_lines.status = 'paid' THEN 'paid' ELSE 'posted' END,
                    updated_at = now()
      RETURNING id INTO line_id;

      IF gross > 0 THEN
        INSERT INTO public.expenses(tenant_id, category, amount, description, spent_at, status, employee_id, source_type, source_id, due_at)
        VALUES (tid, 'salaries', gross, 'راتب وعمولات مستحقة: ' || emp.full_name || ' عن شهر ' || to_char(p_start, 'YYYY-MM'), p_end::timestamptz, 'payable', emp.id, 'auto_payroll_line', line_id, p_end::timestamptz)
        ON CONFLICT (tenant_id, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL
        DO UPDATE SET amount = EXCLUDED.amount,
                      description = EXCLUDED.description,
                      spent_at = EXCLUDED.spent_at,
                      status = CASE WHEN public.expenses.status = 'paid' THEN 'paid' ELSE 'payable' END,
                      due_at = EXCLUDED.due_at
        RETURNING id INTO exp_id;
        UPDATE public.payroll_lines SET expense_id = exp_id WHERE id = line_id;
      END IF;

      rows_count := rows_count + 1;
      gross_sum := gross_sum + gross;
      advances_sum := advances_sum + advances_total;
      net_sum := net_sum + net;
    END IF;
  END LOOP;

  UPDATE public.payroll_periods
  SET status = CASE WHEN status = 'paid' THEN 'paid' ELSE 'posted' END,
      gross_total = gross_sum,
      advances_total = advances_sum,
      net_total = net_sum,
      posted_at = COALESCE(posted_at, now()),
      updated_at = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('period_id', p_id, 'period_start', p_start, 'period_end', p_end, 'employees_count', rows_count, 'gross_total', gross_sum, 'advances_total', advances_sum, 'net_total', net_sum);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_monthly_payroll_payables(date) TO authenticated;
