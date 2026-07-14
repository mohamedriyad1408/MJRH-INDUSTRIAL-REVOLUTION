-- Branch separation model:
-- One tenant = one company/laundry brand. Branches are separated inside the tenant.
-- Managers/owner can aggregate all branches; regular branch staff see their branch data only.

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.cash_accounts ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.task_assignments ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.daily_cash_closings ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS employees_tenant_branch_idx ON public.employees(tenant_id, branch_id, is_active);
CREATE INDEX IF NOT EXISTS orders_tenant_branch_idx ON public.orders(tenant_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cash_accounts_tenant_branch_idx ON public.cash_accounts(tenant_id, branch_id, is_active);
CREATE INDEX IF NOT EXISTS expenses_tenant_branch_idx ON public.expenses(tenant_id, branch_id, spent_at DESC);
CREATE INDEX IF NOT EXISTS inventory_items_tenant_branch_idx ON public.inventory_items(tenant_id, branch_id, is_active);
CREATE INDEX IF NOT EXISTS inventory_movements_tenant_branch_idx ON public.inventory_movements(tenant_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS task_assignments_tenant_branch_idx ON public.task_assignments(tenant_id, branch_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS daily_cash_closings_tenant_branch_idx ON public.daily_cash_closings(tenant_id, branch_id, closing_date DESC);

CREATE OR REPLACE FUNCTION public.default_branch_id_for(_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE bid uuid;
BEGIN
  SELECT id INTO bid FROM public.branches WHERE tenant_id = _tenant_id AND is_active ORDER BY CASE WHEN name = 'الفرع الرئيسي' THEN 0 ELSE 1 END, created_at LIMIT 1;
  IF bid IS NULL THEN
    bid := public.ensure_default_branch_for(_tenant_id, NULL);
  END IF;
  RETURN bid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.default_branch_id_for(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.current_employee_branch_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.branch_id
  FROM public.employees e
  WHERE e.profile_id = auth.uid()
    AND e.tenant_id = public.current_tenant_id()
    AND e.is_active = true
  ORDER BY e.created_at
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.current_employee_branch_id() TO authenticated;

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
      OR _branch_id IS NULL
      OR _branch_id = public.current_employee_branch_id()
    )
$$;
GRANT EXECUTE ON FUNCTION public.can_access_branch(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_default_branch_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL AND NEW.branch_id IS NULL THEN
    NEW.branch_id := COALESCE(public.current_employee_branch_id(), public.default_branch_id_for(NEW.tenant_id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_default_branch ON public.orders;
CREATE TRIGGER trg_orders_default_branch BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_default_branch_id();
DROP TRIGGER IF EXISTS trg_cash_accounts_default_branch ON public.cash_accounts;
CREATE TRIGGER trg_cash_accounts_default_branch BEFORE INSERT ON public.cash_accounts FOR EACH ROW EXECUTE FUNCTION public.set_default_branch_id();
DROP TRIGGER IF EXISTS trg_expenses_default_branch ON public.expenses;
CREATE TRIGGER trg_expenses_default_branch BEFORE INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_default_branch_id();
DROP TRIGGER IF EXISTS trg_inventory_items_default_branch ON public.inventory_items;
CREATE TRIGGER trg_inventory_items_default_branch BEFORE INSERT ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.set_default_branch_id();
DROP TRIGGER IF EXISTS trg_inventory_movements_default_branch ON public.inventory_movements;
CREATE TRIGGER trg_inventory_movements_default_branch BEFORE INSERT ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION public.set_default_branch_id();
DROP TRIGGER IF EXISTS trg_task_assignments_default_branch ON public.task_assignments;
CREATE TRIGGER trg_task_assignments_default_branch BEFORE INSERT ON public.task_assignments FOR EACH ROW EXECUTE FUNCTION public.set_default_branch_id();

CREATE OR REPLACE FUNCTION public.set_cash_closing_branch_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.branch_id IS NULL AND NEW.cash_account_id IS NOT NULL THEN
    SELECT branch_id INTO NEW.branch_id FROM public.cash_accounts WHERE id = NEW.cash_account_id;
  END IF;
  IF NEW.branch_id IS NULL AND NEW.tenant_id IS NOT NULL THEN
    NEW.branch_id := public.default_branch_id_for(NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_daily_cash_closings_branch ON public.daily_cash_closings;
CREATE TRIGGER trg_daily_cash_closings_branch BEFORE INSERT OR UPDATE ON public.daily_cash_closings FOR EACH ROW EXECUTE FUNCTION public.set_cash_closing_branch_id();

-- Replace broad tenant policies on key branch-scoped tables with branch-aware policies.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='orders' LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', p.policyname); END LOOP;
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='employees' LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.employees', p.policyname); END LOOP;
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='cash_accounts' LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.cash_accounts', p.policyname); END LOOP;
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='expenses' LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.expenses', p.policyname); END LOOP;
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='inventory_items' LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.inventory_items', p.policyname); END LOOP;
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='inventory_movements' LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.inventory_movements', p.policyname); END LOOP;
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='task_assignments' LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.task_assignments', p.policyname); END LOOP;
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='daily_cash_closings' LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.daily_cash_closings', p.policyname); END LOOP;
END $$;

CREATE POLICY orders_branch_all ON public.orders FOR ALL TO authenticated USING (public.can_access_branch(tenant_id, branch_id)) WITH CHECK (public.can_access_branch(tenant_id, branch_id));
CREATE POLICY employees_branch_all ON public.employees FOR ALL TO authenticated USING (public.can_access_branch(tenant_id, branch_id) OR profile_id = auth.uid()) WITH CHECK (public.can_access_branch(tenant_id, branch_id) OR profile_id = auth.uid());
CREATE POLICY cash_accounts_branch_all ON public.cash_accounts FOR ALL TO authenticated USING (public.can_access_branch(tenant_id, branch_id)) WITH CHECK (public.can_access_branch(tenant_id, branch_id));
CREATE POLICY expenses_branch_all ON public.expenses FOR ALL TO authenticated USING (public.can_access_branch(tenant_id, branch_id)) WITH CHECK (public.can_access_branch(tenant_id, branch_id));
CREATE POLICY inventory_items_branch_all ON public.inventory_items FOR ALL TO authenticated USING (public.can_access_branch(tenant_id, branch_id)) WITH CHECK (public.can_access_branch(tenant_id, branch_id));
CREATE POLICY inventory_movements_branch_all ON public.inventory_movements FOR ALL TO authenticated USING (public.can_access_branch(tenant_id, branch_id)) WITH CHECK (public.can_access_branch(tenant_id, branch_id));
CREATE POLICY task_assignments_branch_all ON public.task_assignments FOR ALL TO authenticated USING (public.can_access_branch(tenant_id, branch_id)) WITH CHECK (public.can_access_branch(tenant_id, branch_id));
CREATE POLICY daily_cash_closings_branch_all ON public.daily_cash_closings FOR ALL TO authenticated USING (public.can_access_branch(tenant_id, branch_id)) WITH CHECK (public.can_access_branch(tenant_id, branch_id));

-- Backfill existing data to a default branch per tenant.
DO $$
DECLARE r record; bid uuid;
BEGIN
  FOR r IN SELECT id, name FROM public.tenants LOOP
    bid := public.ensure_default_branch_for(r.id, r.name);
    UPDATE public.employees SET branch_id = bid WHERE tenant_id = r.id AND branch_id IS NULL;
    UPDATE public.orders SET branch_id = bid WHERE tenant_id = r.id AND branch_id IS NULL;
    UPDATE public.cash_accounts SET branch_id = bid WHERE tenant_id = r.id AND branch_id IS NULL;
    UPDATE public.expenses SET branch_id = bid WHERE tenant_id = r.id AND branch_id IS NULL;
    UPDATE public.inventory_items SET branch_id = bid WHERE tenant_id = r.id AND branch_id IS NULL;
    UPDATE public.inventory_movements SET branch_id = bid WHERE tenant_id = r.id AND branch_id IS NULL;
    UPDATE public.task_assignments SET branch_id = bid WHERE tenant_id = r.id AND branch_id IS NULL;
    UPDATE public.daily_cash_closings SET branch_id = bid WHERE tenant_id = r.id AND branch_id IS NULL;
  END LOOP;
END $$;

-- Tenant defaults must include default branch from now on.
CREATE OR REPLACE FUNCTION public.seed_tenant_defaults(_tenant_id uuid, _tenant_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_settings (tenant_id, business_name)
  VALUES (_tenant_id, COALESCE(_tenant_name, 'مغسلة'))
  ON CONFLICT (tenant_id) DO NOTHING;

  PERFORM public.ensure_default_branch_for(_tenant_id, _tenant_name);
  PERFORM public.ensure_default_cash_account_for(_tenant_id);
  PERFORM public.ensure_default_chart_accounts_for(_tenant_id);

  INSERT INTO public.service_items (tenant_id, name, service_type, unit_price, is_active, category_id)
  SELECT _tenant_id, x.name, x.service_type, x.unit_price, x.is_active, NULL
  FROM (
    SELECT DISTINCT ON (name) name, service_type, unit_price, is_active
    FROM public.service_items
    WHERE tenant_id IS NOT NULL AND tenant_id <> _tenant_id
    ORDER BY name, created_at DESC
  ) x
  WHERE NOT EXISTS (SELECT 1 FROM public.service_items s WHERE s.tenant_id = _tenant_id AND s.name = x.name);
END;
$$;
