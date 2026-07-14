-- Easy mode: make monthly salaries/commissions visible as payable expenses automatically.

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
    SELECT id, full_name, COALESCE(monthly_salary,0) AS monthly_salary, COALESCE(commission_percent,0) AS commission_percent
    FROM public.employees
    WHERE tenant_id = tid AND is_active = true
    ORDER BY full_name
  LOOP
    SELECT COALESCE(SUM(amount),0) INTO daily_total
    FROM public.daily_salaries
    WHERE tenant_id = tid AND employee_id = emp.id AND work_date BETWEEN p_start AND p_end;

    SELECT COALESCE(SUM(line_value),0) * (emp.commission_percent / 100.0) INTO commission_total
    FROM public.service_units
    WHERE tenant_id = tid
      AND assigned_ironing_employee_id = emp.id
      AND ironing_completed_at::date BETWEEN p_start AND p_end;

    SELECT COALESCE(SUM(amount),0) INTO advances_total
    FROM public.employee_requests
    WHERE tenant_id = tid AND employee_id = emp.id AND type = 'advance' AND status = 'approved'
      AND created_at::date BETWEEN p_start AND p_end;

    gross := COALESCE(emp.monthly_salary,0) + COALESCE(daily_total,0) + COALESCE(commission_total,0);
    net := GREATEST(0, gross - COALESCE(advances_total,0));

    IF gross > 0 OR advances_total > 0 THEN
      INSERT INTO public.payroll_lines(
        tenant_id, payroll_period_id, employee_id, base_salary, daily_salary, commission_amount,
        gross_pay, advances_deducted, net_pay, status, notes
      ) VALUES (
        tid, p_id, emp.id, emp.monthly_salary, daily_total, commission_total,
        gross, advances_total, net, 'posted', 'توليد تلقائي من النظام'
      )
      ON CONFLICT (payroll_period_id, employee_id)
      DO UPDATE SET
        base_salary = EXCLUDED.base_salary,
        daily_salary = EXCLUDED.daily_salary,
        commission_amount = EXCLUDED.commission_amount,
        gross_pay = EXCLUDED.gross_pay,
        advances_deducted = EXCLUDED.advances_deducted,
        net_pay = EXCLUDED.net_pay,
        status = CASE WHEN public.payroll_lines.status = 'paid' THEN 'paid' ELSE 'posted' END,
        updated_at = now()
      RETURNING id INTO line_id;

      IF gross > 0 THEN
        INSERT INTO public.expenses(
          tenant_id, category, amount, description, spent_at, status, employee_id,
          source_type, source_id, due_at
        ) VALUES (
          tid, 'salaries', gross,
          'راتب وعمولات مستحقة: ' || emp.full_name || ' عن شهر ' || to_char(p_start, 'YYYY-MM'),
          p_end::timestamptz, 'payable', emp.id,
          'auto_payroll_line', line_id, p_end::timestamptz
        )
        ON CONFLICT (tenant_id, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL
        DO UPDATE SET amount = EXCLUDED.amount,
                      description = EXCLUDED.description,
                      spent_at = EXCLUDED.spent_at,
                      status = CASE WHEN public.expenses.status = 'paid' THEN 'paid' ELSE 'payable' END,
                      due_at = EXCLUDED.due_at
        RETURNING id INTO exp_id;

        UPDATE public.payroll_lines SET expense_id = exp_id WHERE id = line_id;
      END IF;

      INSERT INTO public.employee_financial_ledger(tenant_id, employee_id, entry_type, amount, direction, source_type, source_id, description, entry_at)
      VALUES (tid, emp.id, 'salary_accrual', gross, 'employee_due', 'auto_payroll_line', line_id, 'استحقاق راتب وعمولات تلقائي', p_end::timestamptz)
      ON CONFLICT (tenant_id, employee_id, entry_type, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;

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

  RETURN jsonb_build_object(
    'period_id', p_id,
    'period_start', p_start,
    'period_end', p_end,
    'employees_count', rows_count,
    'gross_total', gross_sum,
    'advances_total', advances_sum,
    'net_total', net_sum
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_monthly_payroll_payables(date) TO authenticated;
