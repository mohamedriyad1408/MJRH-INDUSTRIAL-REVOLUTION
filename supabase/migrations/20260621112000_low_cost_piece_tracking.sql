-- Low-cost piece tracking layer
-- Keeps the order-level workflow, while recording the pieces inside each order
-- and allowing lightweight label printing, photos, ironing distribution, and cleaning returns.

CREATE TABLE IF NOT EXISTS public.service_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  unit_number integer NOT NULL,
  label_code text NOT NULL UNIQUE,
  qr_code text NOT NULL UNIQUE,
  name text NOT NULL,
  garment_type text NOT NULL DEFAULT 'أخرى',
  service_type public.service_type NOT NULL DEFAULT 'both',
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  line_value numeric(10,2) NOT NULL DEFAULT 0,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'received',
  current_stage text NOT NULL DEFAULT 'received',
  complexity_factor numeric(8,2) NOT NULL DEFAULT 1,
  is_shirt_like boolean NOT NULL DEFAULT false,
  photo_url text,
  customer_notes text,
  staff_notes text,
  assigned_ironing_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ironing_assigned_at timestamptz,
  ironing_completed_at timestamptz,
  needs_reclean boolean NOT NULL DEFAULT false,
  reclean_reason text,
  reclean_reported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reclean_reported_at timestamptz,
  reclean_resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, unit_number)
);

CREATE INDEX IF NOT EXISTS service_units_order_idx ON public.service_units(order_id);
CREATE INDEX IF NOT EXISTS service_units_tenant_idx ON public.service_units(tenant_id);
CREATE INDEX IF NOT EXISTS service_units_ironing_emp_idx ON public.service_units(assigned_ironing_employee_id);
CREATE INDEX IF NOT EXISTS service_units_reclean_idx ON public.service_units(tenant_id, needs_reclean) WHERE needs_reclean = true;

CREATE OR REPLACE FUNCTION public.set_service_unit_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ord_no integer;
  ord_tenant uuid;
  next_no integer;
BEGIN
  SELECT order_number, tenant_id INTO ord_no, ord_tenant
  FROM public.orders
  WHERE id = NEW.order_id;

  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := ord_tenant;
  END IF;

  IF NEW.unit_number IS NULL THEN
    SELECT COALESCE(MAX(unit_number), 0) + 1 INTO next_no
    FROM public.service_units
    WHERE order_id = NEW.order_id;
    NEW.unit_number := next_no;
  END IF;

  IF NEW.name IS NULL OR length(trim(NEW.name)) = 0 THEN
    NEW.name := COALESCE(NEW.garment_type, 'قطعة');
  END IF;

  IF NEW.garment_type IS NULL OR length(trim(NEW.garment_type)) = 0 THEN
    NEW.garment_type := NEW.name;
  END IF;

  IF NEW.label_code IS NULL OR length(trim(NEW.label_code)) = 0 THEN
    NEW.label_code := '#' || COALESCE(ord_no::text, 'ORD') || '-' || lpad(NEW.unit_number::text, 2, '0');
  END IF;

  IF NEW.qr_code IS NULL OR length(trim(NEW.qr_code)) = 0 THEN
    NEW.qr_code := NEW.label_code;
  END IF;

  IF NEW.is_shirt_like IS NULL THEN
    NEW.is_shirt_like := NEW.name ILIKE '%قميص%'
      OR NEW.name ILIKE '%بلوز%'
      OR NEW.name ILIKE '%shirt%'
      OR NEW.name ILIKE '%blouse%';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_units_defaults ON public.service_units;
CREATE TRIGGER trg_service_units_defaults
BEFORE INSERT OR UPDATE ON public.service_units
FOR EACH ROW EXECUTE FUNCTION public.set_service_unit_defaults();

ALTER TABLE public.service_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_units_tenant_all ON public.service_units;
CREATE POLICY service_units_tenant_all ON public.service_units
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

-- Public bucket for low-cost proof photos / optional label assets.
INSERT INTO storage.buckets (id, name, public)
VALUES ('unit-media', 'unit-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS unit_media_staff_read ON storage.objects;
CREATE POLICY unit_media_staff_read ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'unit-media');

DROP POLICY IF EXISTS unit_media_staff_insert ON storage.objects;
CREATE POLICY unit_media_staff_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'unit-media');

DROP POLICY IF EXISTS unit_media_staff_update ON storage.objects;
CREATE POLICY unit_media_staff_update ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'unit-media')
WITH CHECK (bucket_id = 'unit-media');
