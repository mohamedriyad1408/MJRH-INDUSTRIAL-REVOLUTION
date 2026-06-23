-- Tenant-aware customer portal by slug.

CREATE OR REPLACE FUNCTION public.customer_portal_verify(_phone text, _slug text DEFAULT NULL)
RETURNS TABLE(id uuid, full_name text, phone text, address text, lat double precision, lng double precision)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.full_name, c.phone, c.address, c.lat, c.lng
  FROM public.customers c
  LEFT JOIN public.tenants t ON t.id = c.tenant_id
  WHERE public.portal_phone_key(c.phone) = public.portal_phone_key(_phone)
    AND (_slug IS NULL OR t.slug = _slug)
  ORDER BY c.created_at DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.customer_portal_services(_phone text, _slug text DEFAULT NULL)
RETURNS TABLE(id uuid, name text, price numeric, service_type public.service_type)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH c AS (
    SELECT c.tenant_id
    FROM public.customers c
    LEFT JOIN public.tenants t ON t.id = c.tenant_id
    WHERE public.portal_phone_key(c.phone) = public.portal_phone_key(_phone)
      AND (_slug IS NULL OR t.slug = _slug)
    ORDER BY c.created_at DESC LIMIT 1
  )
  SELECT s.id, s.name, s.unit_price AS price, s.service_type
  FROM public.service_items s, c
  WHERE s.tenant_id = c.tenant_id AND s.is_active = true
  ORDER BY s.name
$$;

CREATE OR REPLACE FUNCTION public.customer_portal_orders(_phone text, _slug text DEFAULT NULL)
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
    SELECT c.id
    FROM public.customers c
    LEFT JOIN public.tenants t ON t.id = c.tenant_id
    WHERE public.portal_phone_key(c.phone) = public.portal_phone_key(_phone)
      AND (_slug IS NULL OR t.slug = _slug)
    ORDER BY c.created_at DESC LIMIT 1
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

CREATE OR REPLACE FUNCTION public.customer_portal_create_order(_phone text, _items jsonb, _notes text DEFAULT NULL, _image_urls text[] DEFAULT '{}', _slug text DEFAULT NULL)
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
  SELECT c.* INTO c
  FROM public.customers AS c
  LEFT JOIN public.tenants t ON t.id = c.tenant_id
  WHERE public.portal_phone_key(c.phone) = public.portal_phone_key(_phone)
    AND (_slug IS NULL OR t.slug = _slug)
  ORDER BY c.created_at DESC LIMIT 1;

  IF c.id IS NULL THEN
    RAISE EXCEPTION 'الرقم غير مسجل';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb)) LOOP
    qty := GREATEST(1, COALESCE((item->>'qty')::int, 1));
    SELECT * INTO svc FROM public.service_items AS si
    WHERE si.id = (item->>'service_item_id')::uuid AND si.tenant_id = c.tenant_id AND si.is_active = true;
    IF svc.id IS NOT NULL THEN subtotal := subtotal + (qty * svc.unit_price); END IF;
  END LOOP;

  INSERT INTO public.orders(customer_id, tenant_id, order_type, status, pickup_address, delivery_address, pickup_lat, pickup_lng, delivery_lat, delivery_lng, subtotal, total, notes)
  VALUES (c.id, c.tenant_id, 'delivery', 'received', c.address, c.address, c.lat, c.lng, c.lat, c.lng, subtotal, subtotal, _notes)
  RETURNING * INTO ord;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb)) LOOP
    qty := GREATEST(1, COALESCE((item->>'qty')::int, 1));
    SELECT * INTO svc FROM public.service_items AS si
    WHERE si.id = (item->>'service_item_id')::uuid AND si.tenant_id = c.tenant_id AND si.is_active = true;
    IF svc.id IS NOT NULL THEN
      INSERT INTO public.order_items(order_id, tenant_id, service_item_id, name, service_type, qty, unit_price)
      VALUES (ord.id, c.tenant_id, svc.id, svc.name, svc.service_type, qty, svc.unit_price)
      RETURNING * INTO inserted_item;
      FOR i IN 1..qty LOOP
        INSERT INTO public.service_units(order_id, order_item_id, unit_number, name, garment_type, service_type, unit_price, line_value, status, current_stage, tenant_id, photo_url)
        VALUES (ord.id, inserted_item.id, unit_no, svc.name, svc.name, svc.service_type, svc.unit_price, svc.unit_price, 'received', 'received', c.tenant_id, item->>'image_url');
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

  RETURN QUERY SELECT ord.id::uuid, ord.order_number::integer;
END;
$$;

GRANT EXECUTE ON FUNCTION public.customer_portal_verify(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_portal_services(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_portal_orders(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_portal_create_order(text, jsonb, text, text[], text) TO anon, authenticated;
