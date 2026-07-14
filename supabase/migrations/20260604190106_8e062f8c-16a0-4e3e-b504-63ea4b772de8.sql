
-- Phase 1: Schema extensions for laundry management requirements

-- Extend tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS subscription_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS brand_color text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- tenant_features (key/value feature flags per tenant)
CREATE TABLE IF NOT EXISTS public.tenant_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, feature_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_features TO authenticated;
GRANT ALL ON public.tenant_features TO service_role;
ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY tf_super ON public.tenant_features FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY tf_tenant_read ON public.tenant_features FOR SELECT TO authenticated
  USING (public.can_access_tenant(tenant_id));

-- branches (نقاط التشغيل)
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY br_tenant ON public.branches FOR ALL TO authenticated
  USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));

-- daily_salaries
CREATE TABLE IF NOT EXISTS public.daily_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  amount numeric NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_salaries TO authenticated;
GRANT ALL ON public.daily_salaries TO service_role;
ALTER TABLE public.daily_salaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY ds_tenant ON public.daily_salaries FOR ALL TO authenticated
  USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));

-- expense category enum + columns
DO $$ BEGIN
  CREATE TYPE public.expense_category AS ENUM ('salaries','rent','water','electricity','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS category public.expense_category NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS monthly_percentage numeric;

-- job_role enum on employees
DO $$ BEGIN
  CREATE TYPE public.job_role AS ENUM ('ops_manager','cs_manager','cleaning_tech','ironing_tech','packing_tech','driver','receptionist','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS job_role public.job_role NOT NULL DEFAULT 'other';

-- task_assignments (per-station assignment)
DO $$ BEGIN
  CREATE TYPE public.workstation AS ENUM ('reception','cleaning','ironing','packing','delivery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  station public.workstation NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_assignments TO authenticated;
GRANT ALL ON public.task_assignments TO service_role;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY ta_tenant ON public.task_assignments FOR ALL TO authenticated
  USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));

-- Extend leave_requests with broader types
DO $$ BEGIN
  CREATE TYPE public.staff_request_type AS ENUM ('overtime','prayer','lunch','rest','advance','leave');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS request_type public.staff_request_type;

-- Extend orders
DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('cash','instapay','card','transfer','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS urgent_fee_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method public.payment_method,
  ADD COLUMN IF NOT EXISTS order_type text;

-- service_categories
CREATE TABLE IF NOT EXISTS public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_categories TO authenticated;
GRANT ALL ON public.service_categories TO service_role;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY sc_tenant ON public.service_categories FOR ALL TO authenticated
  USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));

ALTER TABLE public.service_items
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.service_categories(id) ON DELETE SET NULL;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $f$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $f$;

DROP TRIGGER IF EXISTS trg_tf_upd ON public.tenant_features;
CREATE TRIGGER trg_tf_upd BEFORE UPDATE ON public.tenant_features
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_br_upd ON public.branches;
CREATE TRIGGER trg_br_upd BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_ds_upd ON public.daily_salaries;
CREATE TRIGGER trg_ds_upd BEFORE UPDATE ON public.daily_salaries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_sc_upd ON public.service_categories;
CREATE TRIGGER trg_sc_upd BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
