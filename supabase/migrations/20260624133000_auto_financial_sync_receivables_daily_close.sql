-- MJRH V2: automatic financial sync, customer receivables, and daily cash closing.

CREATE TABLE IF NOT EXISTS public.customer_financial_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('invoice','payment','adjustment','refund')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  direction text NOT NULL CHECK (direction IN ('customer_owes','customer_paid')),
  source_type text,
  source_id uuid,
  description text,
  entry_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_ledger_tenant_idx ON public.customer_financial_ledger(tenant_id, customer_id, entry_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS customer_ledger_source_unique_idx ON public.customer_financial_ledger(tenant_id, customer_id, entry_type, source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
ALTER TABLE public.customer_financial_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_ledger_tenant_all ON public.customer_financial_ledger;
CREATE POLICY customer_ledger_tenant_all ON public.customer_financial_ledger
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_financial_ledger TO authenticated;
GRANT ALL ON public.customer_financial_ledger TO service_role;

CREATE TABLE IF NOT EXISTS public.daily_cash_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  cash_account_id uuid NOT NULL REFERENCES public.cash_accounts(id) ON DELETE RESTRICT,
  closing_date date NOT NULL DEFAULT CURRENT_DATE,
  opening_balance numeric(12,2) NOT NULL DEFAULT 0,
  cash_in numeric(12,2) NOT NULL DEFAULT 0,
  cash_out numeric(12,2) NOT NULL DEFAULT 0,
  expected_balance numeric(12,2) NOT NULL DEFAULT 0,
  counted_balance numeric(12,2) NOT NULL DEFAULT 0,
  difference numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'closed' CHECK (status IN ('draft','closed','reopened')),
  notes text,
  closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, cash_account_id, closing_date)
);
CREATE INDEX IF NOT EXISTS daily_cash_closings_tenant_idx ON public.daily_cash_closings(tenant_id, closing_date DESC);
ALTER TABLE public.daily_cash_closings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS daily_cash_closings_tenant_all ON public.daily_cash_closings;
CREATE POLICY daily_cash_closings_tenant_all ON public.daily_cash_closings
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_cash_closings TO authenticated;
GRANT ALL ON public.daily_cash_closings TO service_role;

-- Tenant-explicit helpers usable by triggers and RPCs.
CREATE OR REPLACE FUNCTION public.ensure_default_cash_account_for(_tenant_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  SELECT id INTO cid FROM public.cash_accounts WHERE tenant_id = _tenant_id AND name = 'الخزنة الرئيسية' LIMIT 1;
  IF cid IS NULL THEN
    INSERT INTO public.cash_accounts(tenant_id, name, account_type, opening_balance, current_balance)
    VALUES (_tenant_id, 'الخزنة الرئيسية', 'cash', 0, 0)
    RETURNING id INTO cid;
  END IF;
  RETURN cid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_default_cash_account_for(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_default_chart_accounts_for(_tenant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.chart_accounts(tenant_id, code, name, account_type, normal_balance, is_system)
  VALUES
    (_tenant_id,'1000','الخزنة / النقدية','asset','debit',true),
    (_tenant_id,'1010','البنك / InstaPay','asset','debit',true),
    (_tenant_id,'1100','ذمم العملاء','asset','debit',true),
    (_tenant_id,'1200','المخزون','asset','debit',true),
    (_tenant_id,'2000','مصروفات مستحقة / دائنون','liability','credit',true),
    (_tenant_id,'2100','رواتب مستحقة','liability','credit',true),
    (_tenant_id,'3000','رأس المال','equity','credit',true),
    (_tenant_id,'4000','إيرادات الخدمات','revenue','credit',true),
    (_tenant_id,'4100','إيرادات التوصيل','revenue','credit',true),
    (_tenant_id,'5000','مصروفات الرواتب','expense','debit',true),
    (_tenant_id,'5100','مصروفات تشغيلية','expense','debit',true),
    (_tenant_id,'5200','إيجار ومرافق','expense','debit',true),
    (_tenant_id,'5300','مخزون مستهلك','expense','debit',true)
  ON CONFLICT (tenant_id, code) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_default_chart_accounts_for(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.accounting_account_id_for(_tenant_id uuid, _code text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.chart_accounts WHERE tenant_id = _tenant_id AND code = _code LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.accounting_account_id_for(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_journal_entry_for_tenant(
  _tenant_id uuid,
  _entry_date date,
  _description text,
  _source_type text,
  _source_id uuid,
  _lines jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  je uuid; l jsonb; total_debit numeric := 0; total_credit numeric := 0; acc uuid; d numeric; c numeric;
BEGIN
  PERFORM public.ensure_default_chart_accounts_for(_tenant_id);
  IF EXISTS (SELECT 1 FROM public.accounting_periods WHERE tenant_id = _tenant_id AND status = 'closed' AND _entry_date BETWEEN period_start AND period_end) THEN
    RAISE EXCEPTION 'Accounting period is closed';
  END IF;
  FOR l IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    d := COALESCE((l->>'debit')::numeric, 0); c := COALESCE((l->>'credit')::numeric, 0);
    total_debit := total_debit + d; total_credit := total_credit + c;
  END LOOP;
  IF total_debit <= 0 OR total_debit <> total_credit THEN RAISE EXCEPTION 'Journal entry is not balanced'; END IF;
  INSERT INTO public.journal_entries(tenant_id, entry_date, description, source_type, source_id, status, posted_by)
  VALUES (_tenant_id, _entry_date, _description, _source_type, _source_id, 'posted', auth.uid())
  ON CONFLICT (tenant_id, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void'
  DO UPDATE SET description = EXCLUDED.description, updated_at = now()
  RETURNING id INTO je;
  DELETE FROM public.journal_lines WHERE journal_entry_id = je;
  FOR l IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    acc := COALESCE((l->>'account_id')::uuid, public.accounting_account_id_for(_tenant_id, l->>'account_code'));
    d := COALESCE((l->>'debit')::numeric, 0); c := COALESCE((l->>'credit')::numeric, 0);
    INSERT INTO public.journal_lines(tenant_id, journal_entry_id, account_id, debit, credit, memo)
    VALUES (_tenant_id, je, acc, d, c, l->>'memo');
  END LOOP;
  RETURN je;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_journal_entry_for_tenant(uuid,date,text,text,uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_order_financials(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o record; cash_id uuid; amount numeric;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL OR o.status = 'cancelled' THEN RETURN; END IF;
  amount := COALESCE(o.total, 0);
  IF amount <= 0 THEN RETURN; END IF;
  PERFORM public.ensure_default_chart_accounts_for(o.tenant_id);
  cash_id := public.ensure_default_cash_account_for(o.tenant_id);

  INSERT INTO public.customer_financial_ledger(tenant_id, customer_id, order_id, entry_type, amount, direction, source_type, source_id, description, entry_at)
  VALUES (o.tenant_id, o.customer_id, o.id, 'invoice', amount, 'customer_owes', 'order_invoice', o.id, 'فاتورة طلب #' || COALESCE(o.order_number::text, ''), o.created_at)
  ON CONFLICT (tenant_id, customer_id, entry_type, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;

  IF o.payment_status = 'paid' THEN
    INSERT INTO public.customer_financial_ledger(tenant_id, customer_id, order_id, entry_type, amount, direction, source_type, source_id, description, entry_at)
    VALUES (o.tenant_id, o.customer_id, o.id, 'payment', amount, 'customer_paid', 'order_payment', o.id, 'سداد طلب #' || COALESCE(o.order_number::text, ''), now())
    ON CONFLICT (tenant_id, customer_id, entry_type, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;

    INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at)
    VALUES (o.tenant_id, cash_id, 'in', amount, 'order_payment', o.id, 'تحصيل طلب #' || COALESCE(o.order_number::text, ''), now())
    ON CONFLICT (tenant_id, source_type, source_id, direction) WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void' DO NOTHING;

    PERFORM public.create_journal_entry_for_tenant(o.tenant_id, CURRENT_DATE, 'تحصيل إيراد طلب #' || COALESCE(o.order_number::text, ''), 'order_payment', o.id,
      jsonb_build_array(
        jsonb_build_object('account_code','1000','debit',amount,'credit',0,'memo','تحصيل نقدي'),
        jsonb_build_object('account_code','4000','debit',0,'credit',amount,'memo','إيراد خدمات')
      )
    );
  ELSE
    PERFORM public.create_journal_entry_for_tenant(o.tenant_id, o.created_at::date, 'إثبات ذمة طلب #' || COALESCE(o.order_number::text, ''), 'order_receivable', o.id,
      jsonb_build_array(
        jsonb_build_object('account_code','1100','debit',amount,'credit',0,'memo','ذمم عملاء'),
        jsonb_build_object('account_code','4000','debit',0,'credit',amount,'memo','إيراد خدمات آجل')
      )
    );
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_order_financials(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_expense_financials(_expense_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e record; cash_id uuid; exp_code text := '5100'; liab_code text := '2000'; src text;
BEGIN
  SELECT * INTO e FROM public.expenses WHERE id = _expense_id;
  IF e.id IS NULL OR e.status = 'void' THEN RETURN; END IF;
  PERFORM public.ensure_default_chart_accounts_for(e.tenant_id);
  cash_id := public.ensure_default_cash_account_for(e.tenant_id);
  IF e.category = 'salaries' THEN exp_code := '5000'; liab_code := '2100';
  ELSIF e.category IN ('rent','water','electricity') THEN exp_code := '5200';
  END IF;
  src := 'expense_' || e.status;
  IF e.status = 'paid' THEN
    INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at)
    VALUES (e.tenant_id, cash_id, 'out', e.amount, 'expense_payment', e.id, COALESCE(e.description,'مصروف'), COALESCE(e.paid_at, e.spent_at, now()))
    ON CONFLICT (tenant_id, source_type, source_id, direction) WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void' DO NOTHING;
    PERFORM public.create_journal_entry_for_tenant(e.tenant_id, COALESCE(e.spent_at, now())::date, COALESCE(e.description,'مصروف مدفوع'), 'expense_payment', e.id,
      jsonb_build_array(jsonb_build_object('account_code',exp_code,'debit',e.amount,'credit',0), jsonb_build_object('account_code','1000','debit',0,'credit',e.amount)));
  ELSE
    PERFORM public.create_journal_entry_for_tenant(e.tenant_id, COALESCE(e.spent_at, now())::date, COALESCE(e.description,'مصروف مستحق'), 'expense_payable', e.id,
      jsonb_build_array(jsonb_build_object('account_code',exp_code,'debit',e.amount,'credit',0), jsonb_build_object('account_code',liab_code,'debit',0,'credit',e.amount)));
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_expense_financials(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_sync_order_financials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.sync_order_financials(NEW.id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_orders_financial_sync ON public.orders;
CREATE TRIGGER trg_orders_financial_sync
AFTER INSERT OR UPDATE OF payment_status,total,status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_order_financials();

CREATE OR REPLACE FUNCTION public.trg_sync_expense_financials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.sync_expense_financials(NEW.id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_expenses_financial_sync ON public.expenses;
CREATE TRIGGER trg_expenses_financial_sync
AFTER INSERT OR UPDATE OF status,amount,category ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_expense_financials();

CREATE OR REPLACE VIEW public.v_customer_balances AS
SELECT
  c.tenant_id,
  c.id AS customer_id,
  c.full_name,
  c.phone,
  COALESCE(SUM(CASE WHEN l.direction = 'customer_owes' THEN l.amount ELSE -l.amount END),0) AS balance,
  MAX(l.entry_at) AS last_entry_at
FROM public.customers c
LEFT JOIN public.customer_financial_ledger l ON l.customer_id = c.id
GROUP BY c.tenant_id, c.id, c.full_name, c.phone;
GRANT SELECT ON public.v_customer_balances TO authenticated;

DROP TRIGGER IF EXISTS trg_daily_cash_closings_upd ON public.daily_cash_closings;
CREATE TRIGGER trg_daily_cash_closings_upd BEFORE UPDATE ON public.daily_cash_closings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
