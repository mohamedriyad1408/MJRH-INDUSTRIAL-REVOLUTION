-- Low-cost driver location and fair assignment layer

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS current_lat double precision,
  ADD COLUMN IF NOT EXISTS current_lng double precision,
  ADD COLUMN IF NOT EXISTS location_accuracy double precision,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS preferred_areas text[] DEFAULT '{}';

ALTER TABLE public.pickup_requests
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS estimated_pieces integer DEFAULT 1;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS assigned_driver_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pickup_lat double precision,
  ADD COLUMN IF NOT EXISTS pickup_lng double precision,
  ADD COLUMN IF NOT EXISTS delivery_lat double precision,
  ADD COLUMN IF NOT EXISTS delivery_lng double precision,
  ADD COLUMN IF NOT EXISTS delivery_area text;

CREATE INDEX IF NOT EXISTS employees_current_location_idx ON public.employees(location_updated_at);
CREATE INDEX IF NOT EXISTS pickup_requests_geo_idx ON public.pickup_requests(lat, lng);
CREATE INDEX IF NOT EXISTS orders_delivery_geo_idx ON public.orders(delivery_lat, delivery_lng);
CREATE INDEX IF NOT EXISTS orders_assigned_driver_idx ON public.orders(assigned_driver_employee_id);

CREATE TABLE IF NOT EXISTS public.driver_location_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy double precision,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS driver_location_log_employee_time_idx ON public.driver_location_log(employee_id, recorded_at DESC);
ALTER TABLE public.driver_location_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS driver_location_log_tenant_all ON public.driver_location_log;
CREATE POLICY driver_location_log_tenant_all ON public.driver_location_log
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

CREATE OR REPLACE FUNCTION public.set_driver_location_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.employees WHERE id = NEW.employee_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_driver_location_tenant ON public.driver_location_log;
CREATE TRIGGER trg_driver_location_tenant
BEFORE INSERT ON public.driver_location_log
FOR EACH ROW EXECUTE FUNCTION public.set_driver_location_tenant();
