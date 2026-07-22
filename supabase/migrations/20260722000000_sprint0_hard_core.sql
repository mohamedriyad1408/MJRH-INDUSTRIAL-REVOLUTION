-- Sprint 0: The Hard Core Implementation
-- Date: 2026-07-22
-- Ref: PLAN-001 (T-001, T-002, T-003)

-- 1. T-001: Enhance Orders Model
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'qc_status') THEN
    ALTER TABLE public.orders ADD COLUMN qc_status text DEFAULT 'Pending';
  END IF;
END $$;

-- 2. T-002: Policies as DB Constraints (POL-001, POL-003)
-- POL-001: No Delivered state if QC Failed
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_qc_delivery;
ALTER TABLE public.orders ADD CONSTRAINT check_qc_delivery 
  CHECK (NOT (status = 'delivered' AND qc_status = 'Failed'));

-- POL-003: No Delivered state if Unpaid (Walk-in)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_payment_walkin;
ALTER TABLE public.orders ADD CONSTRAINT check_payment_walkin 
  CHECK (NOT (status = 'delivered' AND order_type = 'walk_in' AND payment_status = 'unpaid'));

-- 3. T-003: Create Event Log Table (EVT-Catalog)
CREATE TABLE IF NOT EXISTS public.event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  order_id uuid REFERENCES public.orders(id),
  actor_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for event_log
ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_log_tenant_isolation ON public.event_log
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Grant permissions
GRANT ALL ON public.event_log TO authenticated;
GRANT ALL ON public.event_log TO service_role;
