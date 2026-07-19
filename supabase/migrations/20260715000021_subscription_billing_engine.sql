-- Sprint 4B — Subscription & Billing Engine (additive)

CREATE TABLE IF NOT EXISTS public.core_billing_plans (
  plan_key text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  price_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','quarterly','yearly','custom')),
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  included_capabilities text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.core_billing_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_billing_plans_read ON public.core_billing_plans;
CREATE POLICY core_billing_plans_read ON public.core_billing_plans FOR SELECT TO authenticated USING (is_active);

CREATE TABLE IF NOT EXISTS public.core_organization_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_key text REFERENCES public.core_billing_plans(plan_key),
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','past_due','cancelled','expired')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, plan_key, starts_at)
);
ALTER TABLE public.core_organization_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_org_subscriptions_tenant_all ON public.core_organization_subscriptions;
CREATE POLICY core_org_subscriptions_tenant_all ON public.core_organization_subscriptions FOR ALL TO authenticated USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));

CREATE TABLE IF NOT EXISTS public.core_billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.core_organization_subscriptions(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','paid','void','overdue')),
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, invoice_number)
);
ALTER TABLE public.core_billing_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_billing_invoices_tenant_all ON public.core_billing_invoices;
CREATE POLICY core_billing_invoices_tenant_all ON public.core_billing_invoices FOR ALL TO authenticated USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));
