-- MJRH V2 — Fix customer portal create order record assignment
-- Date: 2026-06-27
-- Prevents PostgreSQL error: record "c" is not assigned yet.

CREATE OR REPLACE FUNCTION public.customer_portal_create_order(
  _phone text,
  _items jsonb,
  _notes text DEFAULT NULL,
  _image_urls text[] DEFAULT '{}',
  _slug text DEFAULT NULL
)
RETURNS TABLE(id uuid, order_number integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cust record;
  ord record;
  item jsonb;
  svc record;
  qty integer;
  subtotal numeric := 0;
  inserted_item record;
  unit_no integer := 1;
  img text;
  pieces_count integer := 0;
BEGIN
  SELECT c.* INTO cust
  FROM public.customers AS c
  LEFT JOIN public.tenants t ON t.id = c.tenant_id
  WHERE public.portal_phone_key(c.phone) = public.portal_phone_key(_phone)
    AND (_slug IS NULL OR t.slug = _slug)
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF NOT FOUND OR cust.id IS NULL THEN
    RAISE EXCEPTION 'رقم الهاتف غير مسجل في هذه المغسلة. سجل كعميل جديد أو تواصل مع المغسلة.';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb)) LOOP
    qty := GREATEST(1, COALESCE((item->>'qty')::int, 1));
    pieces_count := pieces_count + qty;

    SELECT * INTO svc
    FROM public.service_items AS si
    WHERE si.id = NULLIF(item->>'service_item_id','')::uuid
      AND si.tenant_id = cust.tenant_id
      AND si.is_active = true;

    IF FOUND AND svc.id IS NOT NULL THEN
      subtotal := subtotal + (qty * svc.unit_price);
    END IF;
  END LOOP;

  INSERT INTO public.orders(
    customer_id, tenant_id, order_type, status,
    pickup_address, delivery_address, pickup_lat, pickup_lng, delivery_lat, delivery_lng,
    subtotal, total, notes
  ) VALUES (
    cust.id, cust.tenant_id, 'delivery', 'received',
    cust.address, cust.address, cust.lat, cust.lng, cust.lat, cust.lng,
    subtotal, subtotal, _notes
  )
  RETURNING * INTO ord;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb)) LOOP
    qty := GREATEST(1, COALESCE((item->>'qty')::int, 1));

    SELECT * INTO svc
    FROM public.service_items AS si
    WHERE si.id = NULLIF(item->>'service_item_id','')::uuid
      AND si.tenant_id = cust.tenant_id
      AND si.is_active = true;

    IF FOUND AND svc.id IS NOT NULL THEN
      INSERT INTO public.order_items(order_id, tenant_id, service_item_id, name, service_type, qty, unit_price)
      VALUES (ord.id, cust.tenant_id, svc.id, svc.name, svc.service_type, qty, svc.unit_price)
      RETURNING * INTO inserted_item;

      FOR i IN 1..qty LOOP
        INSERT INTO public.service_units(
          order_id, order_item_id, unit_number, name, garment_type, service_type,
          unit_price, line_value, status, current_stage, tenant_id, photo_url
        ) VALUES (
          ord.id, inserted_item.id, unit_no, svc.name, svc.name, svc.service_type,
          svc.unit_price, svc.unit_price, 'received', 'received', cust.tenant_id, item->>'image_url'
        );
        unit_no := unit_no + 1;
      END LOOP;
    END IF;
  END LOOP;

  FOREACH img IN ARRAY COALESCE(_image_urls, '{}') LOOP
    IF img IS NOT NULL AND length(img) > 0 THEN
      INSERT INTO public.order_attachments(tenant_id, order_id, url, label)
      VALUES (cust.tenant_id, ord.id, img, 'صورة من العميل');
    END IF;
  END LOOP;

  INSERT INTO public.pickup_requests(
    tenant_id, customer_id, customer_name, phone, address, location_url, lat, lng,
    estimated_pieces, status, converted_order_id, notes
  ) VALUES (
    cust.tenant_id, cust.id, cust.full_name, cust.phone, COALESCE(cust.address, 'عنوان العميل'), cust.location_url, cust.lat, cust.lng,
    GREATEST(1, pieces_count), 'pending', ord.id, _notes
  );

  INSERT INTO public.app_notifications(tenant_id, audience, title, body, href, tone)
  VALUES
    (cust.tenant_id, 'owner', 'طلب عميل جديد يحتاج استلام', 'طلب #' || ord.order_number || ' من ' || cust.full_name, '/live-map', 'info'),
    (cust.tenant_id, 'driver', 'استلام جديد من عميل', cust.full_name || ' - ' || COALESCE(cust.address, ''), '/driver', 'info');

  RETURN QUERY SELECT ord.id::uuid, ord.order_number::integer;
END;
$$;
GRANT EXECUTE ON FUNCTION public.customer_portal_create_order(text, jsonb, text, text[], text) TO anon, authenticated;
