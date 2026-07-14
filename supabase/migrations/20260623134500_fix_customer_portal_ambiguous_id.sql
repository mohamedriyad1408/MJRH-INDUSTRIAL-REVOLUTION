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
  SELECT * INTO c FROM public.customers AS cu
  WHERE public.portal_phone_key(cu.phone) = public.portal_phone_key(_phone)
  ORDER BY cu.created_at DESC LIMIT 1;

  IF c.id IS NULL THEN
    RAISE EXCEPTION 'الرقم غير مسجل';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb)) LOOP
    qty := GREATEST(1, COALESCE((item->>'qty')::int, 1));
    SELECT * INTO svc
    FROM public.service_items AS si
    WHERE si.id = (item->>'service_item_id')::uuid
      AND si.tenant_id = c.tenant_id
      AND si.is_active = true;
    IF svc.id IS NOT NULL THEN
      subtotal := subtotal + (qty * svc.unit_price);
    END IF;
  END LOOP;

  INSERT INTO public.orders(customer_id, tenant_id, order_type, status, pickup_address, delivery_address, pickup_lat, pickup_lng, delivery_lat, delivery_lng, subtotal, total, notes)
  VALUES (c.id, c.tenant_id, 'delivery', 'received', c.address, c.address, c.lat, c.lng, c.lat, c.lng, subtotal, subtotal, _notes)
  RETURNING * INTO ord;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb)) LOOP
    qty := GREATEST(1, COALESCE((item->>'qty')::int, 1));
    SELECT * INTO svc
    FROM public.service_items AS si
    WHERE si.id = (item->>'service_item_id')::uuid
      AND si.tenant_id = c.tenant_id
      AND si.is_active = true;
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

  RETURN QUERY SELECT ord.id::uuid, ord.order_number::integer;
END;
$$;

GRANT EXECUTE ON FUNCTION public.customer_portal_create_order(text, jsonb, text, text[]) TO anon, authenticated;
