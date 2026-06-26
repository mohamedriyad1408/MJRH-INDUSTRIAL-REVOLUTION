-- Helper used by the cash closing page so it can repair/read the cash safe without showing false zeros.

CREATE OR REPLACE FUNCTION public.repair_cash_closing_basics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid uuid;
  cash_id uuid;
  active_cash_count int := 0;
  fixed jsonb;
  journals jsonb;
BEGIN
  tid := public.current_tenant_id();
  IF tid IS NULL THEN RAISE EXCEPTION 'No tenant'; END IF;

  PERFORM public.ensure_default_chart_accounts_for(tid);
  cash_id := public.ensure_default_cash_account_for(tid);
  fixed := public.repair_cash_account_balances();
  journals := public.sync_manual_cash_transactions_journals();

  SELECT COUNT(*) INTO active_cash_count
  FROM public.cash_accounts
  WHERE tenant_id = tid AND is_active;

  RETURN jsonb_build_object(
    'tenant_id', tid,
    'default_cash_account_id', cash_id,
    'active_cash_accounts', active_cash_count,
    'balance_repair', fixed,
    'manual_journal_sync', journals
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.repair_cash_closing_basics() TO authenticated;

-- Make sure old closings missing tenant_id cannot exist silently after future schema changes.
UPDATE public.daily_cash_closings d
SET tenant_id = ca.tenant_id
FROM public.cash_accounts ca
WHERE d.cash_account_id = ca.id
  AND d.tenant_id IS DISTINCT FROM ca.tenant_id;
