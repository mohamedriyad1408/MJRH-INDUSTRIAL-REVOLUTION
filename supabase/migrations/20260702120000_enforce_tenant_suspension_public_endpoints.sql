-- MJRH V2 — Enforce tenant suspension (is_active = false) across ALL public/anon endpoints.
-- Date: 2026-07-02
--
-- Root cause: Suspending a laundry (tenants.is_active = false) from /admin/tenants only blocked
-- the authenticated staff dashboard (routes/_app.tsx). Every anonymous/public surface — customer
-- portal, public order tracking, customer signup, and the public order-creation/payment RPCs —
-- kept working normally for a suspended tenant because none of these SECURITY DEFINER functions
-- checked tenants.is_active.
--
-- This migration re-defines every public-facing function to require an ACTIVE tenant, and raises
-- a clear, consistent error otherwise so the frontend can show a "suspended" message.

-- ─────────────────────────────────────────────────────────────────────────
-- 1) customer_portal_verify — block lookup for suspended tenants
-- ─────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.customer_portal_verify(text, text);
CREATE FUNCTION public.customer_portal_verify(_phone text, _slug text DEFAULT NULL)
RETURNS TABLE(id uuid, full_name text, phone text, address text, lat double precision, lng double precision)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.full_name, c.phone, c.address, c.lat, c.lng
  FROM public.customers c
  JOIN public.tenants t ON t.id = c.tenant_id
  WHERE public.portal_phone_key(c.phone) = public.portal_phone_key(_phone)
    AND (_slug IS NULL OR t.slug = _slug)
    AND t.is_active = true
  ORDER BY c.created_at DESC
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.customer_portal_verify(text, text) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 2) customer_portal_services
-- ─────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.customer_portal_services(text, text);
CREATE FUNCTION public.customer_portal_services(_phone text, _slug text DEFAULT NULL)
RETURNS TABLE(id uuid, name text, price numeric, service_type public.service_type)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH c AS (
    SELECT c.tenant_id
    FROM public.customers c
    JOIN public.tenants t ON t.id = c.tenant_id
    WHERE public.portal_phone_key(c.phone) = public.portal_phone_key(_phone)
      AND (_slug IS NULL OR t.slug = _slug)
      AND t.is_active = true
    ORDER BY c.created_at DESC LIMIT 1
  )
  SELECT s.id, s.name, s.unit_price AS price, s.service_type
  FROM public.service_items s, c
  WHERE s.tenant_id = c.tenant_id AND s.is_active = true
  ORDER BY s.name
$$;
GRANT EXECUTE ON FUNCTION public.customer_portal_services(text, text) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3) customer_portal_orders — keep full shape from the latest version (pickup status columns)
-- ─────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.customer_portal_orders(text, text);
CREATE FUNCTION public.customer_portal_orders(_phone text, _slug text DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  order_number integer,
  status public.order_status,
  payment_status public.payment_status,
  payment_method public.payment_method,
  total numeric,
  created_at timestamptz,
  promised_delivery_at timestamptz,
  invoice_finalized_at timestamptz,
  payment_proof_url text,
  customer_payment_amount numeric,
  payment_verification_status text,
  overpayment_amount numeric,
  pickup_status text,
  pickup_driver_employee_id uuid,
  picked_up_at timestamptz,
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
    JOIN public.tenants t ON t.id = c.tenant_id
    WHERE public.portal_phone_key(c.phone) = public.portal_phone_key(_phone)
      AND (_slug IS NULL OR t.slug = _slug)
      AND t.is_active = true
    ORDER BY c.created_at DESC LIMIT 1
  ), p AS (
    SELECT DISTINCT ON (converted_order_id)
      converted_order_id, status::text AS pickup_status, driver_employee_id, picked_up_at
    FROM public.pickup_requests
    WHERE converted_order_id IS NOT NULL
    ORDER BY converted_order_id, created_at DESC
  )
  SELECT o.id, o.order_number, o.status, o.payment_status, o.payment_method, o.total, o.created_at, o.promised_delivery_at,
    o.invoice_finalized_at, o.payment_proof_url, o.customer_payment_amount, o.payment_verification_status, o.overpayment_amount,
    p.pickup_status, p.driver_employee_id, p.picked_up_at, o.notes,
    COALESCE(jsonb_agg(jsonb_build_object('name', oi.name, 'qty', oi.qty, 'unit_price', oi.unit_price, 'line_total', oi.line_total)) FILTER (WHERE oi.id IS NOT NULL), '[]'::jsonb) AS order_items
  FROM public.orders o
  JOIN c ON c.id = o.customer_id
  LEFT JOIN p ON p.converted_order_id = o.id
  LEFT JOIN public.order_items oi ON oi.order_id = o.id
  GROUP BY o.id, p.pickup_status, p.driver_employee_id, p.picked_up_at
  ORDER BY o.created_at DESC
  LIMIT 20
$$;
GRANT EXECUTE ON FUNCTION public.customer_portal_orders(text, text) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 4) customer_portal_create_order — hard block placing NEW orders for a suspended tenant
-- ─────────────────────────────────────────────────────────────────────────
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
  JOIN public.tenants t ON t.id = c.tenant_id
  WHERE public.portal_phone_key(c.phone) = public.portal_phone_key(_phone)
    AND (_slug IS NULL OR t.slug = _slug)
    AND t.is_active = true
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF NOT FOUND OR cust.id IS NULL THEN
    RAISE EXCEPTION 'رقم الهاتف غير مسجل في هذه المغسلة، أو أن هذه المغسلة موقوفة حالياً. سجل كعميل جديد أو تواصل مع المغسلة.';
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

-- ─────────────────────────────────────────────────────────────────────────
-- 5) customer_portal_submit_instapay_payment — block new payment submissions
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.customer_portal_submit_instapay_payment(
  _phone text,
  _slug text,
  _order_id uuid,
  _proof_url text,
  _amount numeric,
  _detected_amount numeric DEFAULT NULL
) RETURNS TABLE(status text, required_amount numeric, paid_amount numeric, overpayment numeric, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ord record;
  paid numeric;
  extra numeric;
  driver_id uuid;
  cash_id uuid;
BEGIN
  SELECT o.* INTO ord
  FROM public.orders AS o
  JOIN public.customers AS c ON c.id = o.customer_id
  JOIN public.tenants AS t ON t.id = o.tenant_id
  WHERE o.id = _order_id
    AND public.portal_phone_key(c.phone) = public.portal_phone_key(_phone)
    AND (_slug IS NULL OR t.slug = _slug)
    AND t.is_active = true
  LIMIT 1;

  IF NOT FOUND OR ord.id IS NULL THEN RAISE EXCEPTION 'الطلب غير موجود، لا يخص رقم الهاتف، أو أن المغسلة موقوفة حالياً'; END IF;
  IF ord.invoice_finalized_at IS NULL THEN RAISE EXCEPTION 'الفاتورة لم تتم مراجعتها واعتمادها بعد'; END IF;
  IF COALESCE(_amount,0) <= 0 THEN RAISE EXCEPTION 'قيمة الدفع غير صحيحة'; END IF;

  paid := COALESCE(_detected_amount, _amount);
  extra := GREATEST(0, paid - COALESCE(ord.total,0));
  driver_id := ord.assigned_driver_employee_id;

  UPDATE public.orders
  SET payment_proof_url = _proof_url,
      payment_proof_uploaded_at = now(),
      customer_payment_amount = _amount,
      payment_detected_amount = _detected_amount,
      payment_method = 'instapay',
      payment_verification_status = CASE
        WHEN paid < COALESCE(ord.total,0) THEN 'underpaid'
        WHEN extra > 0 THEN 'overpaid'
        ELSE 'matched'
      END,
      overpayment_amount = extra,
      tip_employee_id = CASE WHEN extra > 0 THEN driver_id ELSE tip_employee_id END,
      payment_status = CASE WHEN paid >= COALESCE(ord.total,0) THEN 'paid' ELSE payment_status END,
      payment_verified_at = CASE WHEN paid >= COALESCE(ord.total,0) THEN now() ELSE payment_verified_at END
  WHERE id = ord.id;

  IF extra > 0 AND driver_id IS NOT NULL THEN
    cash_id := public.ensure_default_cash_account_for(ord.tenant_id);

    IF NOT EXISTS (
      SELECT 1 FROM public.cash_transactions ct
      WHERE ct.tenant_id = ord.tenant_id
        AND ct.source_type = 'driver_tip'
        AND ct.source_id = ord.id
        AND ct.direction = 'in'
        AND ct.status <> 'void'
    ) THEN
      INSERT INTO public.cash_transactions(tenant_id, cash_account_id, direction, amount, source_type, source_id, description, happened_at)
      VALUES (ord.tenant_id, cash_id, 'in', extra, 'driver_tip', ord.id, 'بقشيش زيادة دفع طلب #' || COALESCE(ord.order_number::text,''), now());
    END IF;

    INSERT INTO public.employee_financial_ledger(tenant_id, employee_id, entry_type, amount, direction, source_type, source_id, description, entry_at)
    VALUES (ord.tenant_id, driver_id, 'adjustment', extra, 'employee_due', 'driver_tip', ord.id, 'بقشيش من زيادة دفع طلب #' || COALESCE(ord.order_number::text,''), now())
    ON CONFLICT (tenant_id, employee_id, entry_type, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;

    PERFORM public.create_journal_entry_for_tenant(ord.tenant_id, CURRENT_DATE, 'بقشيش مندوب من زيادة دفع طلب #' || COALESCE(ord.order_number::text,''), 'driver_tip', ord.id,
      jsonb_build_array(
        jsonb_build_object('account_code','1000','debit',extra,'credit',0,'memo','زيادة محصلة'),
        jsonb_build_object('account_code','2100','debit',0,'credit',extra,'memo','بقشيش مستحق للمندوب')
      )
    );
  END IF;

  RETURN QUERY SELECT
    (SELECT payment_verification_status FROM public.orders WHERE id = ord.id),
    ord.total::numeric,
    paid::numeric,
    extra::numeric,
    CASE
      WHEN paid < COALESCE(ord.total,0) THEN 'المبلغ أقل من المطلوب، سيحتاج مراجعة'
      WHEN extra > 0 THEN 'تم تسجيل الدفع والزائد كبقشيش للمندوب'
      ELSE 'تم تسجيل الدفع بنجاح'
    END;
END;
$$;
GRANT EXECUTE ON FUNCTION public.customer_portal_submit_instapay_payment(text,text,uuid,text,numeric,numeric) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 6) get_order_by_token — public tracking link must stop working for a suspended tenant
-- ─────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_order_by_token(uuid);
CREATE FUNCTION public.get_order_by_token(_token uuid)
RETURNS TABLE (
  order_number int,
  status public.order_status,
  payment_status public.payment_status,
  total numeric,
  is_urgent boolean,
  pickup_at timestamptz,
  promised_delivery_at timestamptz,
  customer_chosen_delivery_at timestamptz,
  customer_name text,
  created_at timestamptz,
  pickup_status text,
  picked_up_at timestamptz,
  invoice_finalized_at timestamptz,
  payment_verification_status text,
  overpayment_amount numeric
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH p AS (
    SELECT DISTINCT ON (converted_order_id)
      converted_order_id, status::text AS pickup_status, picked_up_at
    FROM public.pickup_requests
    WHERE converted_order_id IS NOT NULL
    ORDER BY converted_order_id, created_at DESC
  )
  SELECT o.order_number, o.status, o.payment_status, o.total, o.is_urgent,
         o.pickup_at, o.promised_delivery_at, o.customer_chosen_delivery_at,
         c.full_name, o.created_at,
         p.pickup_status, p.picked_up_at,
         o.invoice_finalized_at, o.payment_verification_status, o.overpayment_amount
  FROM public.orders o
  JOIN public.customers c ON c.id = o.customer_id
  JOIN public.tenants t ON t.id = o.tenant_id
  LEFT JOIN p ON p.converted_order_id = o.id
  WHERE o.public_token = _token
    AND t.is_active = true
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_order_by_token(uuid) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 7) get_order_items_by_token — matches get_order_by_token's tenant gate
-- ─────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_order_items_by_token(uuid);
CREATE FUNCTION public.get_order_items_by_token(_token uuid)
RETURNS TABLE (name text, qty int, unit_price numeric, line_total numeric)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT oi.name, oi.qty, oi.unit_price, oi.line_total
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.tenants t ON t.id = o.tenant_id
  WHERE o.public_token = _token
    AND t.is_active = true
  ORDER BY oi.created_at;
$$;
GRANT EXECUTE ON FUNCTION public.get_order_items_by_token(uuid) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 8) set_customer_delivery_choice — block writes for suspended tenants too
-- ─────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.set_customer_delivery_choice(uuid, timestamptz);
CREATE FUNCTION public.set_customer_delivery_choice(_token uuid, _chosen timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders o
  SET customer_chosen_delivery_at = _chosen
  FROM public.tenants t
  WHERE o.public_token = _token
    AND t.id = o.tenant_id
    AND t.is_active = true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_customer_delivery_choice(uuid, timestamptz) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 9) Public directory RPC — powers the new public landing page's list of
--    active tenants/projects using MJRH (name, slug, logo, public_url only).
-- ─────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.list_active_tenants_public();
CREATE FUNCTION public.list_active_tenants_public()
RETURNS TABLE (
  slug text,
  name text,
  logo_url text,
  brand_color text,
  business_type text,
  public_url text
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.slug, t.name, t.logo_url, t.brand_color, t.business_type, t.public_url
  FROM public.tenants t
  WHERE t.is_active = true
  ORDER BY t.created_at ASC;
$$;
GRANT EXECUTE ON FUNCTION public.list_active_tenants_public() TO anon, authenticated;
