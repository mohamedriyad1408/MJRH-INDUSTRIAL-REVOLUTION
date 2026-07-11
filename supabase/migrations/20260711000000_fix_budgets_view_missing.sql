CREATE TABLE IF NOT EXISTS public.operating_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('monthly','weekly')),
  period_label TEXT NOT NULL,
  expected_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  expense_details JSONB DEFAULT '{}'::jsonb,
  actual_revenue NUMERIC(12,2) DEFAULT 0,
  actual_expenses NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, period_label)
);
CREATE INDEX IF NOT EXISTS operating_budgets_tenant_idx ON public.operating_budgets(tenant_id, period_label DESC);
ALTER TABLE public.operating_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS operating_budgets_tenant_all ON public.operating_budgets;
CREATE POLICY operating_budgets_tenant_all ON public.operating_budgets FOR ALL TO authenticated USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operating_budgets TO authenticated;
GRANT ALL ON public.operating_budgets TO service_role;
DROP TRIGGER IF EXISTS trg_operating_budgets_upd ON public.operating_budgets;
CREATE TRIGGER trg_operating_budgets_upd BEFORE UPDATE ON public.operating_budgets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP VIEW IF EXISTS public.v_operating_budgets;
CREATE VIEW public.v_operating_budgets WITH (security_invoker = true) AS
SELECT
  ob.id,
  ob.tenant_id,
  ob.period_type,
  ob.period_label,
  ob.expected_revenue,
  ob.expected_expenses,
  ob.expense_details,
  COALESCE((SELECT SUM(o.total) FROM public.orders o WHERE o.tenant_id = ob.tenant_id AND o.status = 'delivered'),0)::numeric AS actual_revenue,
  COALESCE((SELECT SUM(e.amount) FROM public.expenses e WHERE e.tenant_id = ob.tenant_id AND e.status != 'cancelled'),0)::numeric AS actual_expenses,
  0::numeric AS actual_salaries,
  0::numeric AS actual_rent,
  0::numeric AS actual_electricity,
  0::numeric AS actual_water,
  0::numeric AS actual_supplies,
  0::numeric AS actual_maintenance,
  0::numeric AS actual_marketing,
  0::numeric AS actual_other,
  ob.created_at,
  ob.updated_at
FROM public.operating_budgets ob;
GRANT SELECT ON public.v_operating_budgets TO authenticated;
GRANT SELECT ON public.v_operating_budgets TO anon;
