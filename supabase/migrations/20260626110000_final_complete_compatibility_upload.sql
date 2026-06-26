-- =====================================================
-- MJRH V2 - FINAL COMPLETE MIGRATION UPLOAD (SAFE COMPATIBILITY)
-- =====================================================
-- This migration applies the user's requested all-in-one structure safely on top of
-- the current production schema without breaking existing branch separation/RLS.

-- PART 1: Core Tables / Columns
CREATE TABLE IF NOT EXISTS public.tenant_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, feature_key)
);
ALTER TABLE public.tenant_features ADD COLUMN IF NOT EXISTS is_enabled boolean DEFAULT true;
UPDATE public.tenant_features SET is_enabled = COALESCE(is_enabled, enabled, true);

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS subscription_fee numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS brand_color text DEFAULT '#0ea5e9',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(10,2) NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, employee_id, work_date)
);

DO $$ BEGIN
  CREATE TYPE public.expense_category AS ENUM ('salaries', 'rent', 'water', 'electricity', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS category public.expense_category DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS monthly_percentage numeric(5,2) DEFAULT 0;

DO $$ BEGIN
  CREATE TYPE public.job_role AS ENUM ('ops_manager', 'cs_manager', 'cleaning_tech', 'ironing_tech', 'packing_tech', 'driver', 'receptionist', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS job_role public.job_role DEFAULT 'other';

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
  started_at timestamptz,
  completed_at timestamptz,
  notes text
);
ALTER TABLE public.task_assignments ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

DO $$ BEGIN
  CREATE TYPE public.staff_request_type AS ENUM ('overtime', 'prayer', 'lunch', 'rest', 'advance', 'leave');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.advance_requests ADD COLUMN IF NOT EXISTS request_type public.staff_request_type DEFAULT 'advance';
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS request_type public.staff_request_type DEFAULT 'leave';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS urgent_fee_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'regular';

CREATE TABLE IF NOT EXISTS public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- PART 2: Branch linking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.cash_accounts ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.daily_cash_closings ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Compatibility inventory table requested by final upload. Existing app uses inventory_items/inventory_movements.
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  quantity numeric(10,2) DEFAULT 0,
  unit text DEFAULT 'قطعة',
  min_quantity numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON public.orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON public.expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON public.employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_accounts_branch_id ON public.cash_accounts(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch_id ON public.inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_branch_id ON public.inventory_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_branch_id ON public.inventory_movements(branch_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_branch_id ON public.task_assignments(branch_id);
CREATE INDEX IF NOT EXISTS idx_daily_cash_closings_branch_id ON public.daily_cash_closings(branch_id);

-- RLS enablement
ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Safe policy creation (Postgres has no CREATE POLICY IF NOT EXISTS).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenant_features' AND policyname='tenant_features_isolation') THEN
    CREATE POLICY tenant_features_isolation ON public.tenant_features FOR ALL TO authenticated
      USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='branches' AND policyname='branches_isolation') THEN
    CREATE POLICY branches_isolation ON public.branches FOR ALL TO authenticated
      USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='daily_salaries' AND policyname='daily_salaries_isolation') THEN
    CREATE POLICY daily_salaries_isolation ON public.daily_salaries FOR ALL TO authenticated
      USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));
  END IF;

  -- Keep branch isolation for task assignments; do not broaden it to tenant-only access.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='task_assignments' AND policyname='task_assignments_branch_isolation') THEN
    CREATE POLICY task_assignments_branch_isolation ON public.task_assignments FOR ALL TO authenticated
      USING (public.can_access_branch(tenant_id, branch_id)) WITH CHECK (public.can_access_branch(tenant_id, branch_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='service_categories' AND policyname='service_categories_isolation') THEN
    CREATE POLICY service_categories_isolation ON public.service_categories FOR ALL TO authenticated
      USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='inventory' AND policyname='inventory_branch_isolation') THEN
    CREATE POLICY inventory_branch_isolation ON public.inventory FOR ALL TO authenticated
      USING (public.can_access_branch(tenant_id, branch_id)) WITH CHECK (public.can_access_branch(tenant_id, branch_id));
  END IF;
END $$;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_features TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_salaries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Ensure defaults for all current tenants.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, name FROM public.tenants LOOP
    PERFORM public.seed_tenant_defaults(r.id, r.name);
  END LOOP;
END $$;

DO $$ BEGIN
  RAISE NOTICE '✅ MJRH V2 - FINAL COMPLETE MIGRATION UPLOADED SAFELY';
END $$;
