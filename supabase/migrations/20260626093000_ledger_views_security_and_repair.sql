-- Make ledger report views follow the logged-in user's tenant permissions and keep repair helpers available.

CREATE OR REPLACE VIEW public.v_trial_balance
WITH (security_invoker = true)
AS
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

CREATE OR REPLACE VIEW public.v_profit_loss
WITH (security_invoker = true)
AS
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

CREATE OR REPLACE FUNCTION public.repair_ledger_basics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid uuid;
  chart_count int := 0;
  cash_id uuid;
  journal_count int := 0;
BEGIN
  tid := public.current_tenant_id();
  IF tid IS NULL THEN RAISE EXCEPTION 'No tenant'; END IF;

  PERFORM public.ensure_default_chart_accounts_for(tid);
  cash_id := public.ensure_default_cash_account_for(tid);
  PERFORM public.sync_manual_cash_transactions_journals();
  PERFORM public.repair_cash_account_balances();

  SELECT COUNT(*) INTO chart_count FROM public.chart_accounts WHERE tenant_id = tid AND is_active;
  SELECT COUNT(*) INTO journal_count FROM public.journal_entries WHERE tenant_id = tid AND status <> 'void';

  RETURN jsonb_build_object(
    'tenant_id', tid,
    'chart_accounts', chart_count,
    'cash_account_id', cash_id,
    'journal_entries', journal_count
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.repair_ledger_basics() TO authenticated;
