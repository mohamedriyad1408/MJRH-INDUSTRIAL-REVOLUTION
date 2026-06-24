-- MJRH V2: real accounting layer (cash safe, transaction log, employee payroll accruals, advance deductions)
-- Additive migration; keeps existing finance pages working while adding accountant-grade structure.

-- Expense lifecycle: payable means it is an expense even if not paid yet.
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE DEFAULT public.current_tenant_id(),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'paid' CHECK (status IN ('payable','paid','void')),
  ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS expenses_tenant_status_idx ON public.expenses(tenant_id, status, spent_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS expenses_source_unique_idx ON public.expenses(tenant_id, source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

DROP POLICY IF EXISTS expenses_tenant_all ON public.expenses;
CREATE POLICY expenses_tenant_all ON public.expenses
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

-- Cash safes / bank / wallets.
CREATE TABLE IF NOT EXISTS public.cash_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  account_type text NOT NULL DEFAULT 'cash' CHECK (account_type IN ('cash','bank','wallet','instapay')),
  opening_balance numeric(12,2) NOT NULL DEFAULT 0,
  current_balance numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);
CREATE INDEX IF NOT EXISTS cash_accounts_tenant_idx ON public.cash_accounts(tenant_id, is_active);
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cash_accounts_tenant_all ON public.cash_accounts;
CREATE POLICY cash_accounts_tenant_all ON public.cash_accounts
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_accounts TO authenticated;
GRANT ALL ON public.cash_accounts TO service_role;

CREATE TABLE IF NOT EXISTS public.cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  cash_account_id uuid NOT NULL REFERENCES public.cash_accounts(id) ON DELETE RESTRICT,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('pending','posted','void')),
  source_type text,
  source_id uuid,
  description text NOT NULL,
  happened_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cash_transactions_tenant_idx ON public.cash_transactions(tenant_id, happened_at DESC);
CREATE INDEX IF NOT EXISTS cash_transactions_account_idx ON public.cash_transactions(cash_account_id, happened_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS cash_transactions_source_unique_idx ON public.cash_transactions(tenant_id, source_type, source_id, direction)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void';
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cash_transactions_tenant_all ON public.cash_transactions;
CREATE POLICY cash_transactions_tenant_all ON public.cash_transactions
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_transactions TO authenticated;
GRANT ALL ON public.cash_transactions TO service_role;

CREATE OR REPLACE FUNCTION public.apply_cash_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'posted' THEN
    UPDATE public.cash_accounts
    SET current_balance = current_balance + CASE WHEN NEW.direction = 'in' THEN NEW.amount ELSE -NEW.amount END,
        updated_at = now()
    WHERE id = NEW.cash_account_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_apply_cash_transaction ON public.cash_transactions;
CREATE TRIGGER trg_apply_cash_transaction
AFTER INSERT ON public.cash_transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_cash_transaction();

-- Employee compensation terms. Snapshot payroll math here instead of relying only on employee row.
CREATE TABLE IF NOT EXISTS public.employee_compensation_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  monthly_salary numeric(12,2) NOT NULL DEFAULT 0,
  daily_rate numeric(12,2) NOT NULL DEFAULT 0,
  commission_percent numeric(6,3) NOT NULL DEFAULT 0,
  pay_frequency text NOT NULL DEFAULT 'monthly' CHECK (pay_frequency IN ('daily','weekly','monthly')),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS employee_comp_terms_active_unique ON public.employee_compensation_terms(employee_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS employee_comp_terms_tenant_idx ON public.employee_compensation_terms(tenant_id, employee_id);
ALTER TABLE public.employee_compensation_terms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS employee_comp_terms_tenant_all ON public.employee_compensation_terms;
CREATE POLICY employee_comp_terms_tenant_all ON public.employee_compensation_terms
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_compensation_terms TO authenticated;
GRANT ALL ON public.employee_compensation_terms TO service_role;

-- Automatically create/update active compensation term when employee is created/updated.
CREATE OR REPLACE FUNCTION public.sync_employee_compensation_term()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.employee_compensation_terms(tenant_id, employee_id, monthly_salary, commission_percent, effective_from, is_active)
  VALUES (NEW.tenant_id, NEW.id, COALESCE(NEW.monthly_salary,0), COALESCE(NEW.commission_percent,0), COALESCE(NEW.hire_date, CURRENT_DATE), true)
  ON CONFLICT (employee_id) WHERE is_active = true
  DO UPDATE SET monthly_salary = EXCLUDED.monthly_salary,
                commission_percent = EXCLUDED.commission_percent,
                updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_employee_compensation_term ON public.employees;
CREATE TRIGGER trg_sync_employee_compensation_term
AFTER INSERT OR UPDATE OF monthly_salary, commission_percent, hire_date, tenant_id ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.sync_employee_compensation_term();

-- Payroll periods and lines. Posting payroll creates payable expenses; paying payroll creates cash out transactions.
CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','paid','void')),
  gross_total numeric(12,2) NOT NULL DEFAULT 0,
  advances_total numeric(12,2) NOT NULL DEFAULT 0,
  net_total numeric(12,2) NOT NULL DEFAULT 0,
  posted_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS payroll_periods_tenant_idx ON public.payroll_periods(tenant_id, period_start DESC);
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payroll_periods_tenant_all ON public.payroll_periods;
CREATE POLICY payroll_periods_tenant_all ON public.payroll_periods
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_periods TO authenticated;
GRANT ALL ON public.payroll_periods TO service_role;

CREATE TABLE IF NOT EXISTS public.payroll_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  payroll_period_id uuid NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  base_salary numeric(12,2) NOT NULL DEFAULT 0,
  daily_salary numeric(12,2) NOT NULL DEFAULT 0,
  commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  overtime_amount numeric(12,2) NOT NULL DEFAULT 0,
  gross_pay numeric(12,2) NOT NULL DEFAULT 0,
  advances_deducted numeric(12,2) NOT NULL DEFAULT 0,
  other_deductions numeric(12,2) NOT NULL DEFAULT 0,
  net_pay numeric(12,2) NOT NULL DEFAULT 0,
  expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  cash_transaction_id uuid REFERENCES public.cash_transactions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','paid','void')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(payroll_period_id, employee_id)
);
CREATE INDEX IF NOT EXISTS payroll_lines_tenant_idx ON public.payroll_lines(tenant_id, employee_id);
ALTER TABLE public.payroll_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payroll_lines_tenant_all ON public.payroll_lines;
CREATE POLICY payroll_lines_tenant_all ON public.payroll_lines
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_lines TO authenticated;
GRANT ALL ON public.payroll_lines TO service_role;

-- Employee financial ledger for transparent balance: salary due, advance, deduction, payment.
CREATE TABLE IF NOT EXISTS public.employee_financial_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('salary_accrual','commission_accrual','advance','advance_deduction','salary_payment','adjustment')),
  amount numeric(12,2) NOT NULL,
  direction text NOT NULL CHECK (direction IN ('employee_due','employee_owes')),
  source_type text,
  source_id uuid,
  description text,
  entry_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS employee_ledger_tenant_idx ON public.employee_financial_ledger(tenant_id, employee_id, entry_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS employee_ledger_source_unique_idx ON public.employee_financial_ledger(tenant_id, employee_id, entry_type, source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
ALTER TABLE public.employee_financial_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS employee_ledger_tenant_all ON public.employee_financial_ledger;
CREATE POLICY employee_ledger_tenant_all ON public.employee_financial_ledger
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_financial_ledger TO authenticated;
GRANT ALL ON public.employee_financial_ledger TO service_role;

-- Seed one cash safe per tenant when a user opens accounting.
CREATE OR REPLACE FUNCTION public.ensure_default_cash_account()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tid uuid;
  cid uuid;
BEGIN
  tid := public.current_tenant_id();
  IF tid IS NULL THEN RAISE EXCEPTION 'No tenant'; END IF;
  SELECT id INTO cid FROM public.cash_accounts WHERE tenant_id = tid AND name = 'الخزنة الرئيسية' LIMIT 1;
  IF cid IS NULL THEN
    INSERT INTO public.cash_accounts(tenant_id, name, account_type, opening_balance, current_balance)
    VALUES (tid, 'الخزنة الرئيسية', 'cash', 0, 0)
    RETURNING id INTO cid;
  END IF;
  RETURN cid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_default_cash_account() TO authenticated;

-- Shared updated_at triggers
DROP TRIGGER IF EXISTS trg_cash_accounts_upd ON public.cash_accounts;
CREATE TRIGGER trg_cash_accounts_upd BEFORE UPDATE ON public.cash_accounts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_employee_comp_terms_upd ON public.employee_compensation_terms;
CREATE TRIGGER trg_employee_comp_terms_upd BEFORE UPDATE ON public.employee_compensation_terms FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_payroll_periods_upd ON public.payroll_periods;
CREATE TRIGGER trg_payroll_periods_upd BEFORE UPDATE ON public.payroll_periods FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_payroll_lines_upd ON public.payroll_lines;
CREATE TRIGGER trg_payroll_lines_upd BEFORE UPDATE ON public.payroll_lines FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
