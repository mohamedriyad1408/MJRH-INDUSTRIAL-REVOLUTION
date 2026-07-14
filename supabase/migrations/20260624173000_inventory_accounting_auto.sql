-- Simple owner-friendly accounting: buying/using stock creates accounting entries automatically.

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid','payable')),
  ADD COLUMN IF NOT EXISTS cash_account_id uuid REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.sync_inventory_movement_accounting(_movement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m record;
  item record;
  amount numeric;
  cash_id uuid;
  exp_id uuid;
  cost numeric;
BEGIN
  SELECT * INTO m FROM public.inventory_movements WHERE id = _movement_id;
  IF m.id IS NULL THEN RETURN; END IF;

  SELECT * INTO item FROM public.inventory_items WHERE id = m.item_id;
  IF item.id IS NULL THEN RETURN; END IF;

  PERFORM public.ensure_default_chart_accounts_for(m.tenant_id);
  cash_id := COALESCE(m.cash_account_id, public.ensure_default_cash_account_for(m.tenant_id));

  -- شراء خامات/مستلزمات: يدخل مخزون ويخرج نقدية أو يثبت دائن.
  IF m.movement_type = 'purchase' THEN
    amount := ROUND(COALESCE(m.qty,0) * COALESCE(NULLIF(m.unit_cost,0), item.avg_unit_cost,0), 2);
    IF amount <= 0 THEN RETURN; END IF;

    IF m.payment_status = 'paid' THEN
      INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at, created_by)
      VALUES (m.tenant_id, cash_id, 'out', amount, 'inventory_purchase', m.id, 'شراء مخزون: ' || item.name, m.created_at, m.created_by)
      ON CONFLICT (tenant_id, source_type, source_id, direction) WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status <> 'void' DO NOTHING;

      PERFORM public.create_journal_entry_for_tenant(m.tenant_id, m.created_at::date, 'شراء مخزون: ' || item.name, 'inventory_purchase', m.id,
        jsonb_build_array(
          jsonb_build_object('account_code','1200','debit',amount,'credit',0,'memo','زيادة مخزون'),
          jsonb_build_object('account_code','1000','debit',0,'credit',amount,'memo','صرف من الخزنة')
        )
      );
    ELSE
      PERFORM public.create_journal_entry_for_tenant(m.tenant_id, m.created_at::date, 'شراء مخزون آجل: ' || item.name, 'inventory_purchase', m.id,
        jsonb_build_array(
          jsonb_build_object('account_code','1200','debit',amount,'credit',0,'memo','زيادة مخزون'),
          jsonb_build_object('account_code','2000','debit',0,'credit',amount,'memo','مورد/دائن')
        )
      );
    END IF;
  END IF;

  -- استهلاك أو هالك: يتحول لمصروف تشغيل فعلي.
  IF m.movement_type IN ('usage','waste') THEN
    cost := COALESCE(NULLIF(m.unit_cost,0), item.avg_unit_cost,0);
    amount := ROUND(COALESCE(m.qty,0) * cost, 2);
    IF amount <= 0 THEN RETURN; END IF;

    INSERT INTO public.expenses(tenant_id, category, amount, description, spent_at, status, source_type, source_id, created_by)
    VALUES (m.tenant_id, 'supplies', amount, CASE WHEN m.movement_type = 'waste' THEN 'هالك مخزون: ' ELSE 'استهلاك مخزون: ' END || item.name, m.created_at, 'paid', 'inventory_usage', m.id, m.created_by)
    ON CONFLICT (tenant_id, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL
    DO UPDATE SET amount = EXCLUDED.amount, description = EXCLUDED.description
    RETURNING id INTO exp_id;

    UPDATE public.inventory_movements SET expense_id = exp_id WHERE id = m.id;

    PERFORM public.create_journal_entry_for_tenant(m.tenant_id, m.created_at::date, CASE WHEN m.movement_type = 'waste' THEN 'هالك مخزون: ' ELSE 'استهلاك مخزون: ' END || item.name, 'inventory_usage', m.id,
      jsonb_build_array(
        jsonb_build_object('account_code','5300','debit',amount,'credit',0,'memo','مصروف خامات'),
        jsonb_build_object('account_code','1200','debit',0,'credit',amount,'memo','نقص مخزون')
      )
    );
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_inventory_movement_accounting(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_inventory_movement_accounting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_inventory_movement_accounting(NEW.id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_inventory_movement_accounting ON public.inventory_movements;
CREATE TRIGGER trg_inventory_movement_accounting
AFTER INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.trg_inventory_movement_accounting();
