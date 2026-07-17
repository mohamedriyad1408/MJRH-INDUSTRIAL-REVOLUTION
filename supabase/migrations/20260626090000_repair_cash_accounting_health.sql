-- Harden cash/accounting integrity so the system health page can verify real operation, not only table existence.

-- 1) Cash balance trigger must handle INSERT, UPDATE and DELETE.
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

-- 2) Expected balance helper. Some old accounts have opening_balance only, newer accounts have an opening cash transaction.
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
  FROM a CROSS JOIN tx;
$$;
GRANT EXECUTE ON FUNCTION public.cash_account_expected_balance(uuid) TO authenticated;

CREATE OR REPLACE VIEW public.v_cash_account_health
WITH (security_invoker = true)
AS
SELECT
  ca.tenant_id,
  ca.id,
  ca.name,
  ca.account_type,
  ca.opening_balance,
  ca.current_balance,
  public.cash_account_expected_balance(ca.id) AS expected_balance,
  ca.current_balance - public.cash_account_expected_balance(ca.id) AS balance_difference,
  COUNT(ct.id) FILTER (WHERE ct.status = 'posted') AS posted_transactions_count,
  COALESCE(SUM(ct.amount) FILTER (WHERE ct.status = 'posted' AND ct.direction = 'in'), 0) AS posted_in,
  COALESCE(SUM(ct.amount) FILTER (WHERE ct.status = 'posted' AND ct.direction = 'out'), 0) AS posted_out,
  MAX(ct.happened_at) AS last_transaction_at,
  ca.is_active,
  ca.updated_at
FROM public.cash_accounts ca
LEFT JOIN public.cash_transactions ct ON ct.cash_account_id = ca.id
GROUP BY ca.tenant_id, ca.id, ca.name, ca.account_type, ca.opening_balance, ca.current_balance, ca.is_active, ca.updated_at;
GRANT SELECT ON public.v_cash_account_health TO authenticated;

-- 3) Manual cash movements must create an accounting journal automatically.
CREATE OR REPLACE FUNCTION public.sync_manual_cash_transaction_journal(_cash_transaction_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
  debit_code text;
  je uuid;
BEGIN
  SELECT ct.*, ca.account_type
  INTO t
  FROM public.cash_transactions ct
  JOIN public.cash_accounts ca ON ca.id = ct.cash_account_id
  WHERE ct.id = _cash_transaction_id;

  IF t.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Automatic sources already have their own business journal.
  IF COALESCE(t.source_type, 'manual_cash_transaction') <> 'manual_cash_transaction' THEN
    RETURN NULL;
  END IF;

  IF t.status <> 'posted' THEN
    UPDATE public.journal_entries
    SET status = 'void', updated_at = now()
    WHERE tenant_id = t.tenant_id
      AND source_type = 'manual_cash_transaction'
      AND source_id = t.id
      AND status <> 'void';
    RETURN NULL;
  END IF;

  PERFORM public.ensure_default_chart_accounts_for(t.tenant_id);
  debit_code := CASE WHEN t.account_type IN ('bank','wallet','instapay') THEN '1010' ELSE '1000' END;

  IF t.direction = 'in' THEN
    je := public.create_journal_entry_for_tenant(
      t.tenant_id,
      t.happened_at::date,
      COALESCE(t.description, 'حركة خزنة داخلة'),
      'manual_cash_transaction',
      t.id,
      jsonb_build_array(
        jsonb_build_object('account_code', debit_code, 'debit', t.amount, 'credit', 0, 'memo', 'داخل للخزنة'),
        jsonb_build_object('account_code', '3000', 'debit', 0, 'credit', t.amount, 'memo', 'إيداع / تسوية مالك')
      )
    );
  ELSE
    je := public.create_journal_entry_for_tenant(
      t.tenant_id,
      t.happened_at::date,
      COALESCE(t.description, 'حركة خزنة خارجة'),
      'manual_cash_transaction',
      t.id,
      jsonb_build_array(
        jsonb_build_object('account_code', '5100', 'debit', t.amount, 'credit', 0, 'memo', COALESCE(t.description, 'مصروف تشغيل')),
        jsonb_build_object('account_code', debit_code, 'debit', 0, 'credit', t.amount, 'memo', 'خارج من الخزنة')
      )
    );
  END IF;

  RETURN je;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_manual_cash_transaction_journal(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_sync_manual_cash_transaction_journal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.journal_entries
    SET status = 'void', updated_at = now()
    WHERE tenant_id = OLD.tenant_id
      AND source_type = 'manual_cash_transaction'
      AND source_id = OLD.id
      AND status <> 'void';
    RETURN OLD;
  END IF;

  PERFORM public.sync_manual_cash_transaction_journal(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_manual_cash_transaction_journal ON public.cash_transactions;
CREATE TRIGGER trg_sync_manual_cash_transaction_journal
AFTER INSERT OR UPDATE OF status, direction, amount, description, happened_at ON public.cash_transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_manual_cash_transaction_journal();

-- 4) Owner repair actions used by System Health.
CREATE OR REPLACE FUNCTION public.repair_cash_account_balances()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid uuid;
  r record;
  fixed_count int := 0;
  total_difference numeric := 0;
  expected numeric;
BEGIN
  tid := public.current_tenant_id();
  IF tid IS NULL THEN RAISE EXCEPTION 'No tenant'; END IF;

  FOR r IN SELECT * FROM public.cash_accounts WHERE tenant_id = tid LOOP
    expected := public.cash_account_expected_balance(r.id);
    IF ABS(COALESCE(r.current_balance,0) - COALESCE(expected,0)) >= 0.01 THEN
      total_difference := total_difference + (COALESCE(r.current_balance,0) - COALESCE(expected,0));
      UPDATE public.cash_accounts SET current_balance = expected, updated_at = now() WHERE id = r.id;
      fixed_count := fixed_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('fixed_count', fixed_count, 'total_difference', total_difference);
END;
$$;
GRANT EXECUTE ON FUNCTION public.repair_cash_account_balances() TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_manual_cash_transactions_journals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid uuid;
  r record;
  created_count int := 0;
  je uuid;
BEGIN
  tid := public.current_tenant_id();
  IF tid IS NULL THEN RAISE EXCEPTION 'No tenant'; END IF;

  FOR r IN
    SELECT ct.id
    FROM public.cash_transactions ct
    LEFT JOIN public.journal_entries je
      ON je.tenant_id = ct.tenant_id
     AND je.source_type = 'manual_cash_transaction'
     AND je.source_id = ct.id
     AND je.status <> 'void'
    WHERE ct.tenant_id = tid
      AND ct.status = 'posted'
      AND ct.source_type IS NULL
      AND je.id IS NULL
  LOOP
    je := public.sync_manual_cash_transaction_journal(r.id);
    IF je IS NOT NULL THEN created_count := created_count + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object('created_count', created_count);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_manual_cash_transactions_journals() TO authenticated;

-- Backfill manual journals safely for existing tenants.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.cash_transactions WHERE source_type IS NULL AND status = 'posted' LOOP
    PERFORM public.sync_manual_cash_transaction_journal(r.id);
  END LOOP;
END $$;
