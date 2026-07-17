-- MJRH V2 — Ironing base value fallback
-- Date: 2026-06-27
-- If no matching ironing catalog item exists, use the unit value as a safe fallback instead of zero.

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

  IF NEW.tenant_id IS NULL THEN NEW.tenant_id := ord_tenant; END IF;

  IF NEW.unit_number IS NULL THEN
    SELECT COALESCE(MAX(unit_number), 0) + 1 INTO next_no
    FROM public.service_units
    WHERE order_id = NEW.order_id;
    NEW.unit_number := next_no;
  END IF;

  IF NEW.name IS NULL OR length(trim(NEW.name)) = 0 THEN NEW.name := COALESCE(NEW.garment_type, 'قطعة'); END IF;
  IF NEW.garment_type IS NULL OR length(trim(NEW.garment_type)) = 0 THEN NEW.garment_type := NEW.name; END IF;

  IF NEW.label_code IS NULL OR length(trim(NEW.label_code)) = 0 THEN
    NEW.label_code := '#' || COALESCE(ord_no::text, 'ORD') || '-' || lpad(NEW.unit_number::text, 2, '0');
  END IF;
  IF NEW.qr_code IS NULL OR length(trim(NEW.qr_code)) = 0 THEN NEW.qr_code := NEW.label_code; END IF;

  IF NEW.is_shirt_like IS NULL THEN
    NEW.is_shirt_like := NEW.name ILIKE '%قميص%'
      OR NEW.name ILIKE '%بلوز%'
      OR NEW.name ILIKE '%shirt%'
      OR NEW.name ILIKE '%blouse%';
  END IF;

  NEW.ironing_base_value := public.estimate_ironing_base_value(
    NEW.tenant_id,
    NEW.name,
    NEW.garment_type,
    COALESCE(NEW.line_value, NEW.unit_price, 0)
  );

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

UPDATE public.service_units su
SET ironing_base_value = public.estimate_ironing_base_value(
  su.tenant_id,
  su.name,
  su.garment_type,
  COALESCE(su.line_value, su.unit_price, 0)
)
WHERE su.tenant_id IS NOT NULL
  AND COALESCE(su.ironing_base_value,0) = 0;
