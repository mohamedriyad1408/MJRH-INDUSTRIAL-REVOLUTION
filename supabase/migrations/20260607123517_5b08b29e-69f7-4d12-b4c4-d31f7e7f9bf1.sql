
-- 1) Extend tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS business_phone TEXT,
  ADD COLUMN IF NOT EXISTS business_address TEXT,
  ADD COLUMN IF NOT EXISTS tax_number TEXT,
  ADD COLUMN IF NOT EXISTS secondary_color TEXT;

-- 2) pickup_requests
DO $$ BEGIN
  CREATE TYPE public.pickup_status AS ENUM ('pending','assigned','picked_up','converted','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.pickup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFAULT public.current_tenant_id(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  location_url TEXT,
  scheduled_at TIMESTAMPTZ,
  driver_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  status public.pickup_status NOT NULL DEFAULT 'pending',
  picked_up_at TIMESTAMPTZ,
  converted_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pickup_requests TO authenticated;
GRANT ALL ON public.pickup_requests TO service_role;
ALTER TABLE public.pickup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pickups_tenant_all" ON public.pickup_requests FOR ALL TO authenticated
  USING (public.can_access_tenant(tenant_id))
  WITH CHECK (public.can_access_tenant(tenant_id));
CREATE TRIGGER pickup_requests_touch BEFORE UPDATE ON public.pickup_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) employee_requests (unified)
DO $$ BEGIN
  CREATE TYPE public.employee_request_type AS ENUM ('overtime','prayer','lunch','break','advance','leave');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.employee_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFAULT public.current_tenant_id(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type public.employee_request_type NOT NULL,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  amount NUMERIC(10,2),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_requests TO authenticated;
GRANT ALL ON public.employee_requests TO service_role;
ALTER TABLE public.employee_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emp_req_tenant_all" ON public.employee_requests FOR ALL TO authenticated
  USING (public.can_access_tenant(tenant_id))
  WITH CHECK (public.can_access_tenant(tenant_id));
CREATE TRIGGER employee_requests_touch BEFORE UPDATE ON public.employee_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4) ironing_rates
CREATE TABLE IF NOT EXISTS public.ironing_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFAULT public.current_tenant_id(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ironing_rates TO authenticated;
GRANT ALL ON public.ironing_rates TO service_role;
ALTER TABLE public.ironing_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ironing_rates_tenant_select" ON public.ironing_rates FOR SELECT TO authenticated
  USING (public.can_access_tenant(tenant_id));
CREATE POLICY "ironing_rates_owner_write" ON public.ironing_rates FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), tenant_id, 'owner'))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), tenant_id, 'owner'));
CREATE TRIGGER ironing_rates_touch BEFORE UPDATE ON public.ironing_rates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5) platform_fees (super admin)
CREATE TABLE IF NOT EXISTS public.platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'standard',
  monthly_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  per_order_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  billing_day INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_fees TO authenticated;
GRANT ALL ON public.platform_fees TO service_role;
ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_fees_super_all" ON public.platform_fees FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "platform_fees_tenant_owner_read" ON public.platform_fees FOR SELECT TO authenticated
  USING (public.has_tenant_role(auth.uid(), tenant_id, 'owner'));
CREATE TRIGGER platform_fees_touch BEFORE UPDATE ON public.platform_fees
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
