-- Secure-ish phone based customer portal RPCs.
-- The portal is phone based, so expose only narrow functions instead of opening tables to anon.

CREATE TABLE IF NOT EXISTS public.order_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  url text NOT NULL,
  label text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_attachments_staff_all ON public.order_attachments;
CREATE POLICY order_attachments_staff_all ON public.order_attachments
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

CREATE OR REPLACE FUNCTION public.portal_phone_key(_phone text)
RETURNS text LANGUAGE SQL IMMUTABLE AS $$
  SELECT right(regexp_replace(coalesce(_phone,''), '\D', '', 'g'), 10)
$$;

CREATE OR REPLACE FUNCTION public.customer_portal_verify(_phone text)
RETURNS TABLE(id uuid, full_name text, phone text, address text, lat double precision, lng double precision)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.full_name, c.phone, c.address, c.lat, c.lng
  FROM public.customers c
  WHERE public.portal_phone_key(c.phone) = public.portal_phone_key(_phone)
  ORDER BY c.created_at DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.customer_portal_services(_phone text)
RETURNS TABLE(id uuid, name text, price numeric, service_type public.service_type)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH c AS (
    SELECT tenant_id FROM public.customers
    WHERE public.portal_phone_key(phone) = public.portal_phone_key(_phone)
    ORDER BY created_at DESC LIMIT 1
  )
  SELECT s.id, s.name, s.unit_price AS price, s.service_type
  FROM public.service_items s, c
  WHERE s.tenant_id = c.tenant_id AND s.is_active = true
  ORDER BY s.name
$$;

CREATE OR REPLACE FUNCTION public.customer_portal_orders(_phone text)
RETURNS TABLE(
  id uuid,
  order_number integer,
  status public.order_status,
  total numeric,
  created_at timestamptz,
  promised_delivery_at timestamptz,
  notes text,
  order_items jsonb
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH c AS (
    SELECT id FROM public.customers
    WHERE public.portal_phone_key(phone) = public.portal_phone_key(_phone)
    ORDER BY created_at DESC LIMIT 1
  )
  SELECT o.id, o.order_number, o.status, o.total, o.created_at, o.promised_delivery_at, o.notes,
    COALESCE(jsonb_agg(jsonb_build_object('name', oi.name, 'qty', oi.qty, 'unit_price', oi.unit_price)) FILTER (WHERE oi.id IS NOT NULL), '[]'::jsonb) AS order_items
  FROM public.orders o
  JOIN c ON c.id = o.customer_id
  LEFT JOIN public.order_items oi ON oi.order_id = o.id
  GROUP BY o.id
  ORDER BY o.created_at DESC
  LIMIT 20
$$;

CREATE OR REPLACE FUNCTION public.customer_portal_create_order(_phone text, _items jsonb, _notes text DEFAULT NULL, _image_urls text[] DEFAULT '{}')
RETURNS TABLE(id uuid, order_number integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  ord record;
  item jsonb;
  svc record;
  qty integer;
  subtotal numeric := 0;
  inserted_item record;
  unit_no integer := 1;
  img text;
BEGIN
  SELECT * INTO c FROM public.customers
  WHERE public.portal_phone_key(phone) = public.portal_phone_key(_phone)
  ORDER BY created_at DESC LIMIT 1;

  IF c.id IS NULL THEN
    RAISE EXCEPTION 'الرقم غير مسجل';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb)) LOOP
    qty := GREATEST(1, COALESCE((item->>'qty')::int, 1));
    SELECT * INTO svc FROM public.service_items WHERE id = (item->>'service_item_id')::uuid AND tenant_id = c.tenant_id AND is_active = true;
    IF svc.id IS NOT NULL THEN
      subtotal := subtotal + (qty * svc.unit_price);
    END IF;
  END LOOP;

  INSERT INTO public.orders(customer_id, tenant_id, order_type, status, pickup_address, delivery_address, pickup_lat, pickup_lng, delivery_lat, delivery_lng, subtotal, total, notes)
  VALUES (c.id, c.tenant_id, 'delivery', 'received', c.address, c.address, c.lat, c.lng, c.lat, c.lng, subtotal, subtotal, _notes)
  RETURNING * INTO ord;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb)) LOOP
    qty := GREATEST(1, COALESCE((item->>'qty')::int, 1));
    SELECT * INTO svc FROM public.service_items WHERE id = (item->>'service_item_id')::uuid AND tenant_id = c.tenant_id AND is_active = true;
    IF svc.id IS NOT NULL THEN
      INSERT INTO public.order_items(order_id, tenant_id, service_item_id, name, service_type, qty, unit_price)
      VALUES (ord.id, c.tenant_id, svc.id, svc.name, svc.service_type, qty, svc.unit_price)
      RETURNING * INTO inserted_item;

      FOR i IN 1..qty LOOP
        INSERT INTO public.service_units(order_id, order_item_id, unit_number, name, garment_type, service_type, unit_price, line_value, status, current_stage, tenant_id)
        VALUES (ord.id, inserted_item.id, unit_no, svc.name, svc.name, svc.service_type, svc.unit_price, svc.unit_price, 'received', 'received', c.tenant_id);
        unit_no := unit_no + 1;
      END LOOP;
    END IF;
  END LOOP;

  FOREACH img IN ARRAY COALESCE(_image_urls, '{}') LOOP
    IF img IS NOT NULL AND length(img) > 0 THEN
      INSERT INTO public.order_attachments(tenant_id, order_id, url, label)
      VALUES (c.tenant_id, ord.id, img, 'صورة من العميل');
    END IF;
  END LOOP;

  RETURN QUERY SELECT ord.id, ord.order_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.customer_portal_verify(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_portal_services(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_portal_orders(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_portal_create_order(text, jsonb, text, text[]) TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('order-attachments', 'order-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS order_attachments_public_insert ON storage.objects;
CREATE POLICY order_attachments_public_insert ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'order-attachments');

DROP POLICY IF EXISTS order_attachments_public_read ON storage.objects;
CREATE POLICY order_attachments_public_read ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'order-attachments');
