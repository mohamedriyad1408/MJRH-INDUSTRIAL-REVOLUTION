-- Transfer money between cash safes/bank/wallet accounts without affecting revenue or expenses.

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
  IF NOT public.can_access_tenant(tid) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN public.transfer_cash_between_accounts_for(tid, _from_cash_account_id, _to_cash_account_id, _amount, _notes);
END;
$$;
GRANT EXECUTE ON FUNCTION public.transfer_cash_between_accounts(uuid,uuid,numeric,text) TO authenticated;
