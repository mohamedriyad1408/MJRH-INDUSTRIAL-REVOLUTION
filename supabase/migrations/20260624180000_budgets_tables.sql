-- Budgets module tables that the UI expects.
CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_label text NOT NULL,
  period_type text NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('monthly','weekly')),
  year integer NOT NULL,
  month integer CHECK (month IS NULL OR month BETWEEN 1 AND 12),
  week integer CHECK (week IS NULL OR week BETWEEN 1 AND 53),
  expected_revenue numeric(12,2) NOT NULL DEFAULT 0,
  expected_expenses numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS budgets_tenant_idx ON public.budgets(tenant_id, year DESC, month DESC);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS budgets_tenant_all ON public.budgets;
CREATE POLICY budgets_tenant_all ON public.budgets
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;

CREATE TABLE IF NOT EXISTS public.budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  category text NOT NULL,
  expected numeric(12,2) NOT NULL DEFAULT 0,
  actual numeric(12,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS budget_items_budget_idx ON public.budget_items(budget_id);
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS budget_items_tenant_all ON public.budget_items;
CREATE POLICY budget_items_tenant_all ON public.budget_items
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_items TO authenticated;
GRANT ALL ON public.budget_items TO service_role;

DROP TRIGGER IF EXISTS trg_budgets_upd ON public.budgets;
CREATE TRIGGER trg_budgets_upd BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_budget_items_upd ON public.budget_items;
CREATE TRIGGER trg_budget_items_upd BEFORE UPDATE ON public.budget_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
