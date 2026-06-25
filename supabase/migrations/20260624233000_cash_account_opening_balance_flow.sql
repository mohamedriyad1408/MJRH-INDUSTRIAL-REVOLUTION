-- Cash account creation with opening balance: create cash movement + opening journal automatically.

CREATE OR REPLACE FUNCTION public.create_cash_account_with_opening(
  _name text,
  _account_type text DEFAULT 'cash',
  _opening_balance numeric DEFAULT 0
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid uuid;
  cid uuid;
  amount numeric;
  debit_code text;
BEGIN
  tid := public.current_tenant_id();
  IF tid IS NULL THEN RAISE EXCEPTION 'No tenant'; END IF;
  IF _name IS NULL OR length(trim(_name)) < 2 THEN RAISE EXCEPTION 'اسم الخزنة مطلوب'; END IF;
  amount := GREATEST(0, COALESCE(_opening_balance, 0));
  debit_code := CASE WHEN _account_type IN ('bank','wallet','instapay') THEN '1010' ELSE '1000' END;

  PERFORM public.ensure_default_chart_accounts_for(tid);

  INSERT INTO public.cash_accounts(tenant_id, name, account_type, opening_balance, current_balance)
  VALUES (tid, trim(_name), COALESCE(_account_type, 'cash'), amount, 0)
  ON CONFLICT (tenant_id, name)
  DO UPDATE SET account_type = EXCLUDED.account_type,
                opening_balance = EXCLUDED.opening_balance,
                updated_at = now()
  RETURNING id INTO cid;

  IF amount > 0 THEN
    -- If the account was just created or had no opening movement, record the movement once.
    INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at, created_by)
    VALUES (tid, cid, 'in', amount, 'cash_opening_balance', cid, 'رصيد افتتاحي: ' || trim(_name), now(), auth.uid())
    ON CONFLICT (tenant_id, source_type, source_id, direction)
      WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void'
    DO NOTHING;

    PERFORM public.create_journal_entry_for_tenant(tid, CURRENT_DATE, 'رصيد افتتاحي: ' || trim(_name), 'cash_opening_balance', cid,
      jsonb_build_array(
        jsonb_build_object('account_code', debit_code, 'debit', amount, 'credit', 0, 'memo', 'رصيد افتتاحي'),
        jsonb_build_object('account_code', '3000', 'debit', 0, 'credit', amount, 'memo', 'رأس المال / رصيد افتتاحي')
      )
    );
  END IF;

  RETURN cid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_cash_account_with_opening(text,text,numeric) TO authenticated;

-- Backfill journals for existing cash accounts with opening balance, without changing their current balance.
DO $$
DECLARE
  r record;
  debit_code text;
BEGIN
  FOR r IN SELECT * FROM public.cash_accounts WHERE COALESCE(opening_balance,0) > 0 LOOP
    PERFORM public.ensure_default_chart_accounts_for(r.tenant_id);
    debit_code := CASE WHEN r.account_type IN ('bank','wallet','instapay') THEN '1010' ELSE '1000' END;
    IF NOT EXISTS (
      SELECT 1 FROM public.journal_entries
      WHERE tenant_id = r.tenant_id AND source_type = 'cash_opening_balance' AND source_id = r.id AND status <> 'void'
    ) THEN
      PERFORM public.create_journal_entry_for_tenant(r.tenant_id, r.created_at::date, 'رصيد افتتاحي: ' || r.name, 'cash_opening_balance', r.id,
        jsonb_build_array(
          jsonb_build_object('account_code', debit_code, 'debit', r.opening_balance, 'credit', 0, 'memo', 'رصيد افتتاحي'),
          jsonb_build_object('account_code', '3000', 'debit', 0, 'credit', r.opening_balance, 'memo', 'رأس المال / رصيد افتتاحي')
        )
      );
    END IF;
  END LOOP;
END $$;
