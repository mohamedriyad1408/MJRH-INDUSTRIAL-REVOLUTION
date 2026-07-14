-- MJRH V2 — Security + Expense Accounting Hardening
-- Date: 2026-06-27
-- Goals:
-- 1) Harden branch/employee RLS without breaking self GPS/profile linking.
-- 2) Make expense accounting automatic and single-source-of-truth from DB triggers.
-- 3) Use the selected expense cash account instead of always using the default safe.
-- 4) Repair older duplicated UI-created expense cash movements.
-- 5) Guard sensitive SECURITY DEFINER RPCs against cross-tenant calls.

-- -----------------------------------------------------------------------------
-- 0) Request/security helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), '')
$$;

CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.jwt_role() = 'service_role'
$$;

CREATE OR REPLACE FUNCTION public.is_privileged_context()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  -- API calls normally run with session_user = authenticator.
  -- Migrations/SQL maintenance run outside authenticator and must be allowed.
  SELECT public.is_service_role() OR session_user <> 'authenticator'
$$;

CREATE OR REPLACE FUNCTION public.can_manage_tenant_finance(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Operational staff may trigger automatic accounting indirectly while moving orders/delivering.
  -- Customers are deliberately excluded.
  SELECT public.is_privileged_context()
    OR public.is_super_admin(auth.uid())
    OR public.has_tenant_role(auth.uid(), _tenant_id, 'owner'::public.app_role)
    OR public.has_tenant_role(auth.uid(), _tenant_id, 'ops_manager'::public.app_role)
    OR public.has_tenant_role(auth.uid(), _tenant_id, 'cs_manager'::public.app_role)
    OR public.has_tenant_role(auth.uid(), _tenant_id, 'employee'::public.app_role)
    OR public.has_tenant_role(auth.uid(), _tenant_id, 'courier'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.can_admin_tenant_finance(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_privileged_context()
    OR public.is_super_admin(auth.uid())
    OR public.has_tenant_role(auth.uid(), _tenant_id, 'owner'::public.app_role)
    OR public.has_tenant_role(auth.uid(), _tenant_id, 'ops_manager'::public.app_role)
    OR public.has_tenant_role(auth.uid(), _tenant_id, 'cs_manager'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_same_employee_identity(_profile_id uuid, _email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (_profile_id IS NOT NULL AND _profile_id = auth.uid())
    OR (
      _email IS NOT NULL
      AND NULLIF(auth.jwt() ->> 'email', '') IS NOT NULL
      AND lower(_email) = lower(auth.jwt() ->> 'email')
    )
$$;

-- -----------------------------------------------------------------------------
-- 1) Branch access: regular employees must not see/write NULL branch rows.
-- Managers still can aggregate tenant-level/null-branch records.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_branch(_tenant_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_access_tenant(_tenant_id)
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_tenant_manager(auth.uid(), _tenant_id)
      OR (_branch_id IS NOT NULL AND _branch_id = public.current_employee_branch_id())
    )
$$;
GRANT EXECUTE ON FUNCTION public.can_access_branch(uuid,uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2) Harden employees RLS while keeping limited self updates for GPS/profile link.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_employee_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  self_match boolean;
BEGIN
  IF public.is_privileged_context()
     OR public.is_super_admin(auth.uid())
     OR public.is_tenant_manager(auth.uid(), COALESCE(OLD.tenant_id, NEW.tenant_id)) THEN
    RETURN NEW;
  END IF;

  self_match := public.is_same_employee_identity(OLD.profile_id, OLD.email)
                OR public.is_same_employee_identity(NEW.profile_id, NEW.email);

  IF NOT self_match THEN
    RAISE EXCEPTION 'Not allowed to update employee';
  END IF;

  -- Self updates may only link profile_id to the current auth user and update live location fields.
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.branch_id IS DISTINCT FROM OLD.branch_id
     OR NEW.full_name IS DISTINCT FROM OLD.full_name
     OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.job_title IS DISTINCT FROM OLD.job_title
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.station IS DISTINCT FROM OLD.station
     OR NEW.job_role IS DISTINCT FROM OLD.job_role
     OR NEW.hire_date IS DISTINCT FROM OLD.hire_date
     OR NEW.monthly_salary IS DISTINCT FROM OLD.monthly_salary
     OR NEW.commission_percent IS DISTINCT FROM OLD.commission_percent
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.notes IS DISTINCT FROM OLD.notes
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.preferred_areas IS DISTINCT FROM OLD.preferred_areas THEN
    RAISE EXCEPTION 'Only live location/profile linking fields can be updated by the employee';
  END IF;

  IF NEW.profile_id IS DISTINCT FROM OLD.profile_id THEN
    IF NOT (OLD.profile_id IS NULL AND NEW.profile_id = auth.uid()) THEN
      RAISE EXCEPTION 'Invalid profile link update';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_employee_self_update ON public.employees;
CREATE TRIGGER trg_protect_employee_self_update
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.protect_employee_self_update();

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='employees' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.employees', p.policyname);
  END LOOP;
END $$;

CREATE POLICY employees_select_manager_branch_or_self ON public.employees
FOR SELECT TO authenticated
USING (
  public.can_access_branch(tenant_id, branch_id)
  OR public.is_same_employee_identity(profile_id, email)
);

CREATE POLICY employees_insert_manager ON public.employees
FOR INSERT TO authenticated
WITH CHECK (
  public.is_privileged_context()
  OR public.is_super_admin(auth.uid())
  OR public.is_tenant_manager(auth.uid(), tenant_id)
);

CREATE POLICY employees_update_manager ON public.employees
FOR UPDATE TO authenticated
USING (
  public.is_privileged_context()
  OR public.is_super_admin(auth.uid())
  OR public.is_tenant_manager(auth.uid(), tenant_id)
)
WITH CHECK (
  public.is_privileged_context()
  OR public.is_super_admin(auth.uid())
  OR public.is_tenant_manager(auth.uid(), tenant_id)
);

CREATE POLICY employees_update_self_limited ON public.employees
FOR UPDATE TO authenticated
USING (public.is_same_employee_identity(profile_id, email))
WITH CHECK (public.is_same_employee_identity(profile_id, email));

CREATE POLICY employees_delete_manager ON public.employees
FOR DELETE TO authenticated
USING (
  public.is_privileged_context()
  OR public.is_super_admin(auth.uid())
  OR public.is_tenant_manager(auth.uid(), tenant_id)
);

-- -----------------------------------------------------------------------------
-- 3) Cash transaction trigger: must reverse balance on UPDATE/DELETE, not only insert.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_cash_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_effect numeric := 0;
  new_effect numeric := 0;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.status = 'posted' THEN
    old_effect := CASE WHEN OLD.direction = 'in' THEN OLD.amount ELSE -OLD.amount END;
    UPDATE public.cash_accounts
    SET current_balance = current_balance - old_effect,
        updated_at = now()
    WHERE id = OLD.cash_account_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.status = 'posted' THEN
    new_effect := CASE WHEN NEW.direction = 'in' THEN NEW.amount ELSE -NEW.amount END;
    UPDATE public.cash_accounts
    SET current_balance = current_balance + new_effect,
        updated_at = now()
    WHERE id = NEW.cash_account_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_cash_transaction ON public.cash_transactions;
CREATE TRIGGER trg_apply_cash_transaction
AFTER INSERT OR UPDATE OR DELETE ON public.cash_transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_cash_transaction();

CREATE OR REPLACE FUNCTION public.cash_account_expected_balance(_cash_account_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH a AS (
    SELECT id, opening_balance FROM public.cash_accounts WHERE id = _cash_account_id
  ), tx AS (
    SELECT
      COALESCE(SUM(CASE WHEN status = 'posted' AND direction = 'in' THEN amount WHEN status = 'posted' AND direction = 'out' THEN -amount ELSE 0 END), 0) AS tx_balance,
      COALESCE(SUM(CASE WHEN status = 'posted' AND source_type = 'cash_opening_balance' THEN amount ELSE 0 END), 0) AS opening_tx
    FROM public.cash_transactions
    WHERE cash_account_id = _cash_account_id
  )
  SELECT COALESCE(
    CASE WHEN tx.opening_tx > 0 THEN tx.tx_balance ELSE COALESCE(a.opening_balance, 0) + tx.tx_balance END,
    0
  )
  FROM a CROSS JOIN tx
$$;

-- -----------------------------------------------------------------------------
-- 4) Expense defaults: paid expenses must have branch/cash account before sync.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pick_cash_account_for_expense(_tenant_id uuid, _branch_id uuid, _cash_account_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
BEGIN
  IF _tenant_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF _cash_account_id IS NOT NULL THEN
    SELECT id INTO cid
    FROM public.cash_accounts
    WHERE id = _cash_account_id
      AND tenant_id = _tenant_id
      AND is_active = true
    LIMIT 1;
    IF cid IS NOT NULL THEN RETURN cid; END IF;
  END IF;

  IF _branch_id IS NOT NULL THEN
    SELECT id INTO cid
    FROM public.cash_accounts
    WHERE tenant_id = _tenant_id
      AND branch_id = _branch_id
      AND is_active = true
    ORDER BY created_at
    LIMIT 1;
    IF cid IS NOT NULL THEN RETURN cid; END IF;
  END IF;

  RETURN public.ensure_default_cash_account_for(_tenant_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_expense_accounting_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;

  IF NEW.branch_id IS NULL AND NEW.cash_account_id IS NOT NULL THEN
    SELECT branch_id INTO NEW.branch_id
    FROM public.cash_accounts
    WHERE id = NEW.cash_account_id AND tenant_id = NEW.tenant_id;
  END IF;

  IF NEW.branch_id IS NULL AND NEW.tenant_id IS NOT NULL THEN
    NEW.branch_id := COALESCE(public.current_employee_branch_id(), public.default_branch_id_for(NEW.tenant_id));
  END IF;

  IF NEW.status = 'paid' THEN
    NEW.cash_account_id := public.pick_cash_account_for_expense(NEW.tenant_id, NEW.branch_id, NEW.cash_account_id);
    NEW.paid_at := COALESCE(NEW.paid_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expenses_accounting_defaults ON public.expenses;
CREATE TRIGGER trg_expenses_accounting_defaults
BEFORE INSERT OR UPDATE OF tenant_id, branch_id, status, cash_account_id, paid_at ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.set_expense_accounting_defaults();

-- -----------------------------------------------------------------------------
-- 5) Journal helper: validate account ids and protect against cross-tenant calls.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_journal_entry_for_tenant(
  _tenant_id uuid,
  _entry_date date,
  _description text,
  _source_type text,
  _source_id uuid,
  _lines jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  je uuid;
  l jsonb;
  total_debit numeric := 0;
  total_credit numeric := 0;
  acc uuid;
  d numeric;
  c numeric;
BEGIN
  IF _tenant_id IS NULL THEN RAISE EXCEPTION 'Tenant is required'; END IF;
  IF NOT public.can_manage_tenant_finance(_tenant_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;

  PERFORM public.ensure_default_chart_accounts_for(_tenant_id);

  IF EXISTS (
    SELECT 1 FROM public.accounting_periods
    WHERE tenant_id = _tenant_id
      AND status = 'closed'
      AND _entry_date BETWEEN period_start AND period_end
  ) THEN
    RAISE EXCEPTION 'Accounting period is closed';
  END IF;

  FOR l IN SELECT * FROM jsonb_array_elements(COALESCE(_lines, '[]'::jsonb)) LOOP
    d := COALESCE((l->>'debit')::numeric, 0);
    c := COALESCE((l->>'credit')::numeric, 0);
    total_debit := total_debit + d;
    total_credit := total_credit + c;
  END LOOP;

  IF total_debit <= 0 OR total_debit <> total_credit THEN
    RAISE EXCEPTION 'Journal entry is not balanced';
  END IF;

  INSERT INTO public.journal_entries(tenant_id, entry_date, description, source_type, source_id, status, posted_by)
  VALUES (_tenant_id, _entry_date, _description, _source_type, _source_id, 'posted', auth.uid())
  ON CONFLICT (tenant_id, source_type, source_id)
    WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void'
  DO UPDATE SET description = EXCLUDED.description, entry_date = EXCLUDED.entry_date, updated_at = now()
  RETURNING id INTO je;

  DELETE FROM public.journal_lines WHERE journal_entry_id = je;

  FOR l IN SELECT * FROM jsonb_array_elements(COALESCE(_lines, '[]'::jsonb)) LOOP
    acc := COALESCE((l->>'account_id')::uuid, public.accounting_account_id_for(_tenant_id, l->>'account_code'));
    IF acc IS NULL THEN
      RAISE EXCEPTION 'Missing chart account: %', COALESCE(l->>'account_code', l->>'account_id');
    END IF;
    d := COALESCE((l->>'debit')::numeric, 0);
    c := COALESCE((l->>'credit')::numeric, 0);
    INSERT INTO public.journal_lines(tenant_id, journal_entry_id, account_id, debit, credit, memo)
    VALUES (_tenant_id, je, acc, d, c, l->>'memo');
  END LOOP;

  RETURN je;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6) Expense sync: automatic payable/payment journals and cash movement.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_expense_financials(_expense_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e record;
  cash_id uuid;
  cash_code text := '1000';
  exp_code text := '5100';
  liab_code text := '2000';
  has_payable_journal boolean := false;
  has_payroll_cash_payment boolean := false;
BEGIN
  SELECT * INTO e FROM public.expenses WHERE id = _expense_id;
  IF e.id IS NULL THEN RETURN; END IF;
  IF NOT public.can_manage_tenant_finance(e.tenant_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;

  IF e.status = 'void' THEN
    UPDATE public.journal_entries
    SET status = 'void', updated_at = now()
    WHERE tenant_id = e.tenant_id
      AND source_id = e.id
      AND source_type IN ('expense_payable','expense_payment')
      AND status <> 'void';

    UPDATE public.cash_transactions
    SET status = 'void'
    WHERE tenant_id = e.tenant_id
      AND source_type IN ('expense_payment','expense')
      AND source_id = e.id
      AND status <> 'void';
    RETURN;
  END IF;

  PERFORM public.ensure_default_chart_accounts_for(e.tenant_id);

  IF e.category = 'salaries' THEN
    exp_code := '5000';
    liab_code := '2100';
  ELSIF e.category IN ('rent','water','electricity') THEN
    exp_code := '5200';
  ELSIF e.category IN ('supplies','inventory','stock') THEN
    exp_code := '5300';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.journal_entries
    WHERE tenant_id = e.tenant_id
      AND source_type = 'expense_payable'
      AND source_id = e.id
      AND status <> 'void'
  ) INTO has_payable_journal;

  SELECT EXISTS (
    SELECT 1
    FROM public.cash_transactions ct
    WHERE ct.tenant_id = e.tenant_id
      AND ct.source_type = 'payroll_payment'
      AND ct.source_id = e.source_id
      AND ct.status = 'posted'
  ) INTO has_payroll_cash_payment;

  IF e.status = 'payable' THEN
    -- Payable/accrued expense: Dr Expense, Cr Payable.
    PERFORM public.create_journal_entry_for_tenant(e.tenant_id, COALESCE(e.spent_at, now())::date, COALESCE(e.description,'مصروف مستحق'), 'expense_payable', e.id,
      jsonb_build_array(
        jsonb_build_object('account_code', exp_code, 'debit', e.amount, 'credit', 0, 'memo', 'إثبات المصروف المستحق'),
        jsonb_build_object('account_code', liab_code, 'debit', 0, 'credit', e.amount, 'memo', 'مصروف مستحق / آجل')
      )
    );

    -- If it was previously paid then reverted to payable, void the payment side.
    UPDATE public.journal_entries
    SET status = 'void', updated_at = now()
    WHERE tenant_id = e.tenant_id
      AND source_type = 'expense_payment'
      AND source_id = e.id
      AND status <> 'void';
    UPDATE public.cash_transactions
    SET status = 'void'
    WHERE tenant_id = e.tenant_id
      AND source_type = 'expense_payment'
      AND source_id = e.id
      AND status <> 'void';
    RETURN;
  END IF;

  IF e.status = 'paid' THEN
    cash_id := public.pick_cash_account_for_expense(e.tenant_id, e.branch_id, e.cash_account_id);
    IF cash_id IS NULL THEN RAISE EXCEPTION 'No cash account for paid expense'; END IF;

    SELECT CASE WHEN account_type IN ('bank','wallet','instapay') THEN '1010' ELSE '1000' END
    INTO cash_code
    FROM public.cash_accounts
    WHERE id = cash_id;

    -- Keep the expense row linked to the cash account used by accounting sync.
    IF e.cash_account_id IS DISTINCT FROM cash_id THEN
      UPDATE public.expenses SET cash_account_id = cash_id WHERE id = e.id;
    END IF;

    IF has_payable_journal THEN
      -- Keep original accrual amount in sync, then record settlement.
      PERFORM public.create_journal_entry_for_tenant(e.tenant_id, COALESCE(e.spent_at, now())::date, COALESCE(e.description,'مصروف مستحق'), 'expense_payable', e.id,
        jsonb_build_array(
          jsonb_build_object('account_code', exp_code, 'debit', e.amount, 'credit', 0, 'memo', 'إثبات المصروف المستحق'),
          jsonb_build_object('account_code', liab_code, 'debit', 0, 'credit', e.amount, 'memo', 'مصروف مستحق / آجل')
        )
      );

      PERFORM public.create_journal_entry_for_tenant(e.tenant_id, COALESCE(e.paid_at, e.spent_at, now())::date, 'سداد ' || COALESCE(e.description,'مصروف مستحق'), 'expense_payment', e.id,
        jsonb_build_array(
          jsonb_build_object('account_code', liab_code, 'debit', e.amount, 'credit', 0, 'memo', 'إقفال المصروف المستحق'),
          jsonb_build_object('account_code', cash_code, 'debit', 0, 'credit', e.amount, 'memo', 'صرف من الخزنة')
        )
      );
    ELSE
      -- Direct paid expense: Dr Expense, Cr Cash/Bank.
      PERFORM public.create_journal_entry_for_tenant(e.tenant_id, COALESCE(e.spent_at, now())::date, COALESCE(e.description,'مصروف مدفوع'), 'expense_payment', e.id,
        jsonb_build_array(
          jsonb_build_object('account_code', exp_code, 'debit', e.amount, 'credit', 0, 'memo', 'مصروف مدفوع مباشرة'),
          jsonb_build_object('account_code', cash_code, 'debit', 0, 'credit', e.amount, 'memo', 'صرف من الخزنة')
        )
      );
    END IF;

    IF NOT has_payroll_cash_payment THEN
      INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at, created_by)
      VALUES (e.tenant_id, cash_id, 'out', e.amount, 'expense_payment', e.id, COALESCE(e.description,'مصروف'), COALESCE(e.paid_at, e.spent_at, now()), e.created_by)
      ON CONFLICT (tenant_id, source_type, source_id, direction)
        WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void'
      DO UPDATE SET
        cash_account_id = EXCLUDED.cash_account_id,
        amount = EXCLUDED.amount,
        description = EXCLUDED.description,
        happened_at = EXCLUDED.happened_at,
        status = 'posted';
    ELSE
      UPDATE public.cash_transactions
      SET status = 'void'
      WHERE tenant_id = e.tenant_id
        AND source_type = 'expense_payment'
        AND source_id = e.id
        AND status <> 'void';
    END IF;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_expense_financials(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_sync_expense_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_expense_financials(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expenses_financial_sync ON public.expenses;
CREATE TRIGGER trg_expenses_financial_sync
AFTER INSERT OR UPDATE OF status, amount, category, cash_account_id, paid_at, spent_at, branch_id ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_expense_financials();

-- -----------------------------------------------------------------------------
-- 7) Order/delivery sync guards against cross-tenant API calls.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_order_financials(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  cash_id uuid;
  cash_code text := '1000';
  amount numeric;
  has_receivable_journal boolean := false;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL THEN RETURN; END IF;
  IF NOT public.can_manage_tenant_finance(o.tenant_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;

  IF o.status = 'cancelled' THEN
    UPDATE public.journal_entries
    SET status = 'void', updated_at = now()
    WHERE tenant_id = o.tenant_id
      AND source_id = o.id
      AND source_type IN ('order_receivable','order_payment')
      AND status <> 'void';
    RETURN;
  END IF;

  amount := COALESCE(o.total, 0);
  IF amount <= 0 THEN RETURN; END IF;

  PERFORM public.ensure_default_chart_accounts_for(o.tenant_id);
  cash_id := public.ensure_default_cash_account_for(o.tenant_id);
  SELECT CASE WHEN account_type IN ('bank','wallet','instapay') THEN '1010' ELSE '1000' END INTO cash_code FROM public.cash_accounts WHERE id = cash_id;

  INSERT INTO public.customer_financial_ledger(tenant_id, customer_id, order_id, entry_type, amount, direction, source_type, source_id, description, entry_at)
  VALUES (o.tenant_id, o.customer_id, o.id, 'invoice', amount, 'customer_owes', 'order_invoice', o.id, 'فاتورة طلب #' || COALESCE(o.order_number::text, ''), o.created_at)
  ON CONFLICT (tenant_id, customer_id, entry_type, source_type, source_id)
    WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;

  SELECT EXISTS (
    SELECT 1 FROM public.journal_entries
    WHERE tenant_id = o.tenant_id
      AND source_type = 'order_receivable'
      AND source_id = o.id
      AND status <> 'void'
  ) INTO has_receivable_journal;

  IF o.payment_status = 'paid' THEN
    INSERT INTO public.customer_financial_ledger(tenant_id, customer_id, order_id, entry_type, amount, direction, source_type, source_id, description, entry_at)
    VALUES (o.tenant_id, o.customer_id, o.id, 'payment', amount, 'customer_paid', 'order_payment', o.id, 'سداد طلب #' || COALESCE(o.order_number::text, ''), now())
    ON CONFLICT (tenant_id, customer_id, entry_type, source_type, source_id)
      WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;

    INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at)
    VALUES (o.tenant_id, cash_id, 'in', amount, 'order_payment', o.id, 'تحصيل طلب #' || COALESCE(o.order_number::text, ''), now())
    ON CONFLICT (tenant_id, source_type, source_id, direction)
      WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void'
    DO UPDATE SET amount = EXCLUDED.amount, cash_account_id = EXCLUDED.cash_account_id, description = EXCLUDED.description, happened_at = EXCLUDED.happened_at, status = 'posted';

    IF has_receivable_journal THEN
      PERFORM public.create_journal_entry_for_tenant(o.tenant_id, CURRENT_DATE, 'تحصيل ذمة طلب #' || COALESCE(o.order_number::text, ''), 'order_payment', o.id,
        jsonb_build_array(
          jsonb_build_object('account_code', cash_code, 'debit', amount, 'credit', 0, 'memo', 'تحصيل نقدي'),
          jsonb_build_object('account_code', '1100', 'debit', 0, 'credit', amount, 'memo', 'إقفال ذمة العميل')
        )
      );
    ELSE
      PERFORM public.create_journal_entry_for_tenant(o.tenant_id, CURRENT_DATE, 'تحصيل إيراد طلب #' || COALESCE(o.order_number::text, ''), 'order_payment', o.id,
        jsonb_build_array(
          jsonb_build_object('account_code', cash_code, 'debit', amount, 'credit', 0, 'memo', 'تحصيل نقدي'),
          jsonb_build_object('account_code', '4000', 'debit', 0, 'credit', amount, 'memo', 'إيراد خدمات')
        )
      );
    END IF;
  ELSE
    PERFORM public.create_journal_entry_for_tenant(o.tenant_id, o.created_at::date, 'إثبات ذمة طلب #' || COALESCE(o.order_number::text, ''), 'order_receivable', o.id,
      jsonb_build_array(
        jsonb_build_object('account_code', '1100', 'debit', amount, 'credit', 0, 'memo', 'ذمم عملاء'),
        jsonb_build_object('account_code', '4000', 'debit', 0, 'credit', amount, 'memo', 'إيراد خدمات آجل')
      )
    );
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_order_financials(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.confirm_delivery_with_collection(uuid,numeric,uuid);
CREATE OR REPLACE FUNCTION public.confirm_delivery_with_collection(_order_id uuid, _collected_amount numeric DEFAULT NULL, _driver_employee_id uuid DEFAULT NULL)
RETURNS TABLE(status text, overpayment numeric, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  paid numeric;
  extra numeric;
  cash_id uuid;
  driver_id uuid;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'الطلب غير موجود'; END IF;
  IF NOT (public.is_privileged_context() OR public.can_access_branch(o.tenant_id, o.branch_id)) THEN RAISE EXCEPTION 'Not allowed'; END IF;

  driver_id := COALESCE(_driver_employee_id, o.assigned_driver_employee_id);
  IF o.payment_status <> 'paid' THEN
    paid := COALESCE(_collected_amount, 0);
    IF paid < COALESCE(o.total,0) THEN RAISE EXCEPTION 'المبلغ المحصل أقل من المطلوب. المطلوب %', COALESCE(o.total,0); END IF;
    extra := GREATEST(0, paid - COALESCE(o.total,0));
    UPDATE public.orders
    SET payment_status = 'paid', payment_method = COALESCE(payment_method, 'cod_cash'), customer_payment_amount = paid,
        overpayment_amount = extra, tip_employee_id = CASE WHEN extra > 0 THEN driver_id ELSE tip_employee_id END,
        payment_verification_status = CASE WHEN extra > 0 THEN 'overpaid' ELSE 'matched' END, payment_verified_at = now()
    WHERE id = o.id;

    IF extra > 0 AND driver_id IS NOT NULL THEN
      cash_id := public.ensure_default_cash_account_for(o.tenant_id);
      INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at)
      VALUES (o.tenant_id, cash_id, 'in', extra, 'driver_tip', o.id, 'بقشيش زيادة دفع طلب #' || COALESCE(o.order_number::text,''), now())
      ON CONFLICT (tenant_id, source_type, source_id, direction) WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void' DO NOTHING;

      INSERT INTO public.employee_financial_ledger(tenant_id, employee_id, entry_type, amount, direction, source_type, source_id, description, entry_at)
      VALUES (o.tenant_id, driver_id, 'adjustment', extra, 'employee_due', 'driver_tip', o.id, 'بقشيش من زيادة دفع طلب #' || COALESCE(o.order_number::text,''), now())
      ON CONFLICT (tenant_id, employee_id, entry_type, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;

      PERFORM public.create_journal_entry_for_tenant(o.tenant_id, CURRENT_DATE, 'بقشيش مندوب من زيادة دفع طلب #' || COALESCE(o.order_number::text,''), 'driver_tip', o.id,
        jsonb_build_array(
          jsonb_build_object('account_code','1000','debit',extra,'credit',0,'memo','زيادة محصلة'),
          jsonb_build_object('account_code','2100','debit',0,'credit',extra,'memo','بقشيش مستحق للمندوب')
        )
      );
    END IF;
    RETURN QUERY SELECT 'paid'::text, extra::numeric, CASE WHEN extra > 0 THEN 'تم التسليم والتحصيل والزائد بقشيش للمندوب' ELSE 'تم التسليم والتحصيل' END::text;
  ELSE
    UPDATE public.orders SET status = 'delivered', delivered_at = now() WHERE id = o.id;
    RETURN QUERY SELECT 'delivered'::text, COALESCE(o.overpayment_amount,0)::numeric, 'تم التسليم'::text;
  END IF;

  UPDATE public.orders SET status = 'delivered', delivered_at = now() WHERE id = o.id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.confirm_delivery_with_collection(uuid,numeric,uuid) TO authenticated;


-- -----------------------------------------------------------------------------
-- 8) Cash transfers: admin-only tenant guard.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_cash_between_accounts_for(
  _tenant_id uuid,
  _from_cash_account_id uuid,
  _to_cash_account_id uuid,
  _amount numeric,
  _notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  from_acc record;
  to_acc record;
  group_id uuid := gen_random_uuid();
  out_tx uuid;
  in_tx uuid;
  from_code text;
  to_code text;
  je uuid;
BEGIN
  IF _tenant_id IS NULL THEN RAISE EXCEPTION 'Tenant is required'; END IF;
  IF NOT public.can_admin_tenant_finance(_tenant_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _from_cash_account_id IS NULL OR _to_cash_account_id IS NULL THEN RAISE EXCEPTION 'اختار خزنة التحويل وخزنة الاستلام'; END IF;
  IF _from_cash_account_id = _to_cash_account_id THEN RAISE EXCEPTION 'لا يمكن التحويل لنفس الخزنة'; END IF;
  IF COALESCE(_amount, 0) <= 0 THEN RAISE EXCEPTION 'مبلغ التحويل يجب أن يكون أكبر من صفر'; END IF;

  SELECT * INTO from_acc FROM public.cash_accounts WHERE id = _from_cash_account_id AND tenant_id = _tenant_id AND is_active FOR UPDATE;
  SELECT * INTO to_acc FROM public.cash_accounts WHERE id = _to_cash_account_id AND tenant_id = _tenant_id AND is_active FOR UPDATE;
  IF from_acc.id IS NULL THEN RAISE EXCEPTION 'خزنة التحويل غير موجودة أو غير تابعة للمغسلة'; END IF;
  IF to_acc.id IS NULL THEN RAISE EXCEPTION 'خزنة الاستلام غير موجودة أو غير تابعة للمغسلة'; END IF;
  IF from_acc.current_balance < _amount THEN
    RAISE EXCEPTION 'رصيد خزنة التحويل غير كاف. الرصيد الحالي: %', from_acc.current_balance;
  END IF;

  INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at, created_by)
  VALUES (_tenant_id, from_acc.id, 'out', _amount, 'cash_transfer', group_id,
          'تحويل إلى ' || to_acc.name || COALESCE(' - ' || NULLIF(trim(_notes), ''), ''), now(), auth.uid())
  RETURNING id INTO out_tx;

  INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at, created_by)
  VALUES (_tenant_id, to_acc.id, 'in', _amount, 'cash_transfer', group_id,
          'تحويل من ' || from_acc.name || COALESCE(' - ' || NULLIF(trim(_notes), ''), ''), now(), auth.uid())
  RETURNING id INTO in_tx;

  PERFORM public.ensure_default_chart_accounts_for(_tenant_id);
  from_code := CASE WHEN from_acc.account_type IN ('bank','wallet','instapay') THEN '1010' ELSE '1000' END;
  to_code := CASE WHEN to_acc.account_type IN ('bank','wallet','instapay') THEN '1010' ELSE '1000' END;

  je := public.create_journal_entry_for_tenant(_tenant_id, CURRENT_DATE,
    'تحويل بين الخزن: ' || from_acc.name || ' إلى ' || to_acc.name,
    'cash_transfer', group_id,
    jsonb_build_array(
      jsonb_build_object('account_code', to_code, 'debit', _amount, 'credit', 0, 'memo', 'استلام في ' || to_acc.name),
      jsonb_build_object('account_code', from_code, 'debit', 0, 'credit', _amount, 'memo', 'خروج من ' || from_acc.name)
    )
  );

  RETURN jsonb_build_object(
    'transfer_id', group_id,
    'from_cash_account_id', from_acc.id,
    'to_cash_account_id', to_acc.id,
    'amount', _amount,
    'out_transaction_id', out_tx,
    'in_transaction_id', in_tx,
    'journal_entry_id', je
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.transfer_cash_between_accounts_for(uuid,uuid,uuid,numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.transfer_cash_between_accounts(
  _from_cash_account_id uuid,
  _to_cash_account_id uuid,
  _amount numeric,
  _notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid uuid;
BEGIN
  tid := public.current_tenant_id();
  IF tid IS NULL THEN RAISE EXCEPTION 'No tenant'; END IF;
  IF NOT public.can_admin_tenant_finance(tid) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN public.transfer_cash_between_accounts_for(tid, _from_cash_account_id, _to_cash_account_id, _amount, _notes);
END;
$$;
GRANT EXECUTE ON FUNCTION public.transfer_cash_between_accounts(uuid,uuid,numeric,text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 9) Operational/repair helpers: tenant guard.
-- -----------------------------------------------------------------------------
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
BEGIN
  tid := COALESCE(public.current_tenant_id(), (_data->>'tenant_id')::uuid);
  IF tid IS NULL THEN RAISE EXCEPTION 'Tenant is required'; END IF;
  IF NOT (public.is_privileged_context() OR public.can_access_branch(tid, _branch_id) OR public.is_tenant_member(auth.uid(), tid)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  INSERT INTO public.operation_events(
    tenant_id, branch_id, actor_id, process_key, process_name, source_type, source_id,
    cash_account_id, journal_entry_id, report_bucket, requires_notification, notification_id,
    notification_created, data, output
  ) VALUES (
    tid, _branch_id, auth.uid(), _process_key, _process_name, _source_type, _source_id,
    _cash_account_id, _journal_entry_id, COALESCE(_report_bucket, 'operational'), COALESCE(_requires_notification, false), _notification_id,
    _notification_id IS NOT NULL, COALESCE(_data, '{}'::jsonb), COALESCE(_output, '{}'::jsonb)
  ) RETURNING id INTO eid;
  RETURN eid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_operation_event(text,text,text,uuid,uuid,uuid,uuid,text,boolean,uuid,jsonb,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.financial_audit_summary(_tenant_id uuid DEFAULT public.current_tenant_id())
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _tenant_id IS NULL OR NOT (public.is_privileged_context() OR public.can_access_tenant(_tenant_id)) THEN
      jsonb_build_object('total', 0, 'danger', 0, 'warn', 0, 'finance', 0, 'accounting', 0, 'readiness', 0)
    ELSE (
      SELECT jsonb_build_object(
        'total', count(*),
        'danger', count(*) FILTER (WHERE severity = 'danger'),
        'warn', count(*) FILTER (WHERE severity = 'warn'),
        'finance', count(*) FILTER (WHERE domain = 'finance'),
        'accounting', count(*) FILTER (WHERE domain = 'accounting'),
        'readiness', count(*) FILTER (WHERE domain = 'readiness')
      )
      FROM public.financial_operation_audit
      WHERE tenant_id = _tenant_id
    )
  END
$$;
GRANT EXECUTE ON FUNCTION public.financial_audit_summary(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.repair_financial_operation_audit(_tenant_id uuid DEFAULT public.current_tenant_id(), _max_items integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  fixed_count integer := 0;
  err_count integer := 0;
  bid uuid;
  cash_id uuid;
  msg text;
BEGIN
  IF _tenant_id IS NULL THEN
    RETURN jsonb_build_object('fixed', 0, 'errors', 1, 'message', 'No tenant');
  END IF;
  IF NOT public.can_admin_tenant_finance(_tenant_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;

  PERFORM public.ensure_default_branch_for(_tenant_id, NULL);
  PERFORM public.ensure_default_cash_account_for(_tenant_id);
  PERFORM public.ensure_default_chart_accounts_for(_tenant_id);

  FOR r IN
    SELECT * FROM public.financial_operation_audit
    WHERE tenant_id = _tenant_id
    ORDER BY CASE WHEN severity = 'danger' THEN 0 ELSE 1 END, created_at DESC
    LIMIT GREATEST(1, COALESCE(_max_items, 100))
  LOOP
    BEGIN
      IF r.issue_key = 'order_missing_branch' THEN
        bid := public.default_branch_id_for(_tenant_id);
        UPDATE public.orders SET branch_id = bid WHERE id = r.source_id AND branch_id IS NULL;
        fixed_count := fixed_count + 1;
      ELSIF r.issue_key = 'cash_account_missing_branch' THEN
        bid := public.default_branch_id_for(_tenant_id);
        UPDATE public.cash_accounts SET branch_id = bid WHERE id = r.source_id AND branch_id IS NULL;
        fixed_count := fixed_count + 1;
      ELSIF r.issue_key = 'inventory_item_missing_branch' THEN
        bid := public.default_branch_id_for(_tenant_id);
        UPDATE public.inventory_items SET branch_id = bid WHERE id = r.source_id AND branch_id IS NULL;
        UPDATE public.inventory_movements SET branch_id = bid WHERE item_id = r.source_id AND branch_id IS NULL;
        fixed_count := fixed_count + 1;
      ELSIF r.source_type = 'order' AND r.issue_key IN ('paid_order_missing_cash_tx','paid_order_missing_journal','receivable_order_missing_journal') THEN
        PERFORM public.sync_order_financials(r.source_id);
        fixed_count := fixed_count + 1;
      ELSIF r.source_type = 'expense' AND r.issue_key IN ('paid_expense_missing_cash_account','paid_expense_missing_journal','payable_expense_missing_journal') THEN
        SELECT COALESCE(e.branch_id, public.default_branch_id_for(e.tenant_id)) INTO bid FROM public.expenses e WHERE e.id = r.source_id;
        cash_id := public.pick_cash_account_for_expense(_tenant_id, bid, NULL);
        UPDATE public.expenses
        SET branch_id = COALESCE(branch_id, bid),
            cash_account_id = CASE WHEN status = 'paid' THEN COALESCE(cash_account_id, cash_id) ELSE cash_account_id END
        WHERE id = r.source_id;
        PERFORM public.sync_expense_financials(r.source_id);
        fixed_count := fixed_count + 1;
      ELSIF r.issue_key = 'cash_tx_missing_journal' THEN
        PERFORM public.sync_manual_cash_transactions_journals();
        fixed_count := fixed_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      err_count := err_count + 1;
    END;
  END LOOP;

  UPDATE public.cash_accounts ca
  SET current_balance = public.cash_account_expected_balance(ca.id), updated_at = now()
  WHERE tenant_id = _tenant_id;

  SELECT count(*)::text INTO msg FROM public.financial_operation_audit WHERE tenant_id = _tenant_id;
  RETURN jsonb_build_object('fixed', fixed_count, 'errors', err_count, 'remaining', msg::integer);
END;
$$;
GRANT EXECUTE ON FUNCTION public.repair_financial_operation_audit(uuid,integer) TO authenticated;

-- -----------------------------------------------------------------------------
-- 10) Backfill and repair existing data.
-- -----------------------------------------------------------------------------
-- Prefer the UI-selected cash account from old source_type='expense' movements.
UPDATE public.expenses e
SET cash_account_id = COALESCE(e.cash_account_id, old_ct.cash_account_id),
    paid_at = COALESCE(e.paid_at, old_ct.happened_at, e.spent_at),
    branch_id = COALESCE(e.branch_id, ca.branch_id)
FROM public.cash_transactions old_ct
LEFT JOIN public.cash_accounts ca ON ca.id = old_ct.cash_account_id
WHERE old_ct.source_type = 'expense'
  AND old_ct.source_id = e.id
  AND old_ct.status = 'posted'
  AND e.status = 'paid';

-- Ensure every paid expense has a cash account.
UPDATE public.expenses e
SET cash_account_id = public.pick_cash_account_for_expense(e.tenant_id, e.branch_id, e.cash_account_id),
    paid_at = COALESCE(e.paid_at, e.spent_at, now())
WHERE e.status = 'paid'
  AND e.tenant_id IS NOT NULL;

-- Re-sync all non-void expenses. This creates/updates the canonical expense_payment cash tx + journal.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.expenses WHERE COALESCE(status,'paid') <> 'void' LOOP
    BEGIN
      PERFORM public.sync_expense_financials(r.id);
    EXCEPTION WHEN OTHERS THEN
      -- Keep migration best-effort; remaining rows will appear in financial_operation_audit.
      NULL;
    END;
  END LOOP;
END $$;

-- Void duplicated old UI-created cash movements after canonical expense_payment exists.
UPDATE public.cash_transactions old_ct
SET status = 'void'
WHERE old_ct.source_type = 'expense'
  AND old_ct.status <> 'void'
  AND EXISTS (
    SELECT 1
    FROM public.cash_transactions new_ct
    WHERE new_ct.tenant_id = old_ct.tenant_id
      AND new_ct.source_type = 'expense_payment'
      AND new_ct.source_id = old_ct.source_id
      AND new_ct.direction = old_ct.direction
      AND new_ct.status = 'posted'
  );

-- Final deterministic balance correction for all tenants/safes.
UPDATE public.cash_accounts ca
SET current_balance = public.cash_account_expected_balance(ca.id),
    updated_at = now();
