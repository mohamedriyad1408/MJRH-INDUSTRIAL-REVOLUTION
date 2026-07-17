-- MJRH V2: Double-entry accounting, financial statements, and monthly closing.
-- This layer turns operational records into accounting journals.

CREATE TABLE IF NOT EXISTS public.chart_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  normal_balance text NOT NULL CHECK (normal_balance IN ('debit','credit')),
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);
CREATE INDEX IF NOT EXISTS chart_accounts_tenant_idx ON public.chart_accounts(tenant_id, account_type, is_active);
ALTER TABLE public.chart_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chart_accounts_tenant_all ON public.chart_accounts;
CREATE POLICY chart_accounts_tenant_all ON public.chart_accounts
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chart_accounts TO authenticated;
GRANT ALL ON public.chart_accounts TO service_role;

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  entry_no bigint,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  source_type text,
  source_id uuid,
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('draft','posted','void')),
  posted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  posted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS journal_entries_tenant_idx ON public.journal_entries(tenant_id, entry_date DESC, status);
CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_source_unique_idx ON public.journal_entries(tenant_id, source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void';
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS journal_entries_tenant_all ON public.journal_entries;
CREATE POLICY journal_entries_tenant_all ON public.journal_entries
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;

CREATE TABLE IF NOT EXISTS public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.chart_accounts(id) ON DELETE RESTRICT,
  debit numeric(12,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit numeric(12,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);
CREATE INDEX IF NOT EXISTS journal_lines_tenant_idx ON public.journal_lines(tenant_id, account_id);
CREATE INDEX IF NOT EXISTS journal_lines_entry_idx ON public.journal_lines(journal_entry_id);
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS journal_lines_tenant_all ON public.journal_lines;
CREATE POLICY journal_lines_tenant_all ON public.journal_lines
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_lines TO authenticated;
GRANT ALL ON public.journal_lines TO service_role;

CREATE TABLE IF NOT EXISTS public.accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS accounting_periods_tenant_idx ON public.accounting_periods(tenant_id, period_start DESC, status);
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accounting_periods_tenant_all ON public.accounting_periods;
CREATE POLICY accounting_periods_tenant_all ON public.accounting_periods
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_periods TO authenticated;
GRANT ALL ON public.accounting_periods TO service_role;

CREATE OR REPLACE FUNCTION public.accounting_period_is_closed(_date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.accounting_periods
    WHERE tenant_id = public.current_tenant_id()
      AND status = 'closed'
      AND _date BETWEEN period_start AND period_end
  );
$$;
GRANT EXECUTE ON FUNCTION public.accounting_period_is_closed(date) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_closed_period_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.accounting_period_is_closed(NEW.entry_date) THEN
    RAISE EXCEPTION 'Accounting period is closed for date %', NEW.entry_date;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_prevent_closed_period_journal ON public.journal_entries;
CREATE TRIGGER trg_prevent_closed_period_journal
BEFORE INSERT OR UPDATE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_period_journal();

CREATE OR REPLACE FUNCTION public.ensure_default_chart_accounts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tid uuid;
BEGIN
  tid := public.current_tenant_id();
  IF tid IS NULL THEN RAISE EXCEPTION 'No tenant'; END IF;

  INSERT INTO public.chart_accounts(tenant_id, code, name, account_type, normal_balance, is_system)
  VALUES
    (tid,'1000','الخزنة / النقدية','asset','debit',true),
    (tid,'1010','البنك / InstaPay','asset','debit',true),
    (tid,'1100','ذمم العملاء','asset','debit',true),
    (tid,'1200','المخزون','asset','debit',true),
    (tid,'2000','مصروفات مستحقة / دائنون','liability','credit',true),
    (tid,'2100','رواتب مستحقة','liability','credit',true),
    (tid,'3000','رأس المال','equity','credit',true),
    (tid,'4000','إيرادات الخدمات','revenue','credit',true),
    (tid,'4100','إيرادات التوصيل','revenue','credit',true),
    (tid,'5000','مصروفات الرواتب','expense','debit',true),
    (tid,'5100','مصروفات تشغيلية','expense','debit',true),
    (tid,'5200','إيجار ومرافق','expense','debit',true),
    (tid,'5300','مخزون مستهلك','expense','debit',true)
  ON CONFLICT (tenant_id, code) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_default_chart_accounts() TO authenticated;

CREATE OR REPLACE FUNCTION public.accounting_account_id(_code text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.chart_accounts
  WHERE tenant_id = public.current_tenant_id() AND code = _code
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.accounting_account_id(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_journal_entry(
  _entry_date date,
  _description text,
  _source_type text,
  _source_id uuid,
  _lines jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tid uuid;
  je uuid;
  l jsonb;
  total_debit numeric := 0;
  total_credit numeric := 0;
  acc uuid;
  d numeric;
  c numeric;
BEGIN
  tid := public.current_tenant_id();
  IF tid IS NULL THEN RAISE EXCEPTION 'No tenant'; END IF;
  PERFORM public.ensure_default_chart_accounts();
  IF public.accounting_period_is_closed(_entry_date) THEN
    RAISE EXCEPTION 'Accounting period is closed';
  END IF;

  FOR l IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    d := COALESCE((l->>'debit')::numeric, 0);
    c := COALESCE((l->>'credit')::numeric, 0);
    total_debit := total_debit + d;
    total_credit := total_credit + c;
  END LOOP;
  IF total_debit <= 0 OR total_debit <> total_credit THEN
    RAISE EXCEPTION 'Journal entry is not balanced. Debit %, Credit %', total_debit, total_credit;
  END IF;

  INSERT INTO public.journal_entries(tenant_id, entry_date, description, source_type, source_id, status, posted_by)
  VALUES (tid, _entry_date, _description, _source_type, _source_id, 'posted', auth.uid())
  ON CONFLICT (tenant_id, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void'
  DO UPDATE SET description = EXCLUDED.description, updated_at = now()
  RETURNING id INTO je;

  DELETE FROM public.journal_lines WHERE journal_entry_id = je;

  FOR l IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    acc := COALESCE((l->>'account_id')::uuid, public.accounting_account_id(l->>'account_code'));
    IF acc IS NULL THEN RAISE EXCEPTION 'Unknown account %', l->>'account_code'; END IF;
    d := COALESCE((l->>'debit')::numeric, 0);
    c := COALESCE((l->>'credit')::numeric, 0);
    INSERT INTO public.journal_lines(tenant_id, journal_entry_id, account_id, debit, credit, memo)
    VALUES (tid, je, acc, d, c, l->>'memo');
  END LOOP;
  RETURN je;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_journal_entry(date,text,text,uuid,jsonb) TO authenticated;

CREATE OR REPLACE VIEW public.v_trial_balance AS
SELECT
  jl.tenant_id,
  ca.id AS account_id,
  ca.code,
  ca.name,
  ca.account_type,
  ca.normal_balance,
  COALESCE(SUM(jl.debit),0) AS total_debit,
  COALESCE(SUM(jl.credit),0) AS total_credit,
  CASE WHEN ca.normal_balance = 'debit'
    THEN COALESCE(SUM(jl.debit - jl.credit),0)
    ELSE COALESCE(SUM(jl.credit - jl.debit),0)
  END AS balance
FROM public.journal_lines jl
JOIN public.chart_accounts ca ON ca.id = jl.account_id
JOIN public.journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted'
GROUP BY jl.tenant_id, ca.id, ca.code, ca.name, ca.account_type, ca.normal_balance;
GRANT SELECT ON public.v_trial_balance TO authenticated;

CREATE OR REPLACE VIEW public.v_profit_loss AS
SELECT
  jl.tenant_id,
  ca.account_type,
  ca.code,
  ca.name,
  SUM(CASE WHEN ca.account_type = 'revenue' THEN jl.credit - jl.debit ELSE jl.debit - jl.credit END) AS amount
FROM public.journal_lines jl
JOIN public.chart_accounts ca ON ca.id = jl.account_id
JOIN public.journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted'
WHERE ca.account_type IN ('revenue','expense')
GROUP BY jl.tenant_id, ca.account_type, ca.code, ca.name;
GRANT SELECT ON public.v_profit_loss TO authenticated;

DROP TRIGGER IF EXISTS trg_chart_accounts_upd ON public.chart_accounts;
CREATE TRIGGER trg_chart_accounts_upd BEFORE UPDATE ON public.chart_accounts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_journal_entries_upd ON public.journal_entries;
CREATE TRIGGER trg_journal_entries_upd BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_accounting_periods_upd ON public.accounting_periods;
CREATE TRIGGER trg_accounting_periods_upd BEFORE UPDATE ON public.accounting_periods FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
