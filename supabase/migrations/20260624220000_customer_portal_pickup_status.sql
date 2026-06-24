-- Show pickup mission status inside customer portal orders.
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
    LEFT JOIN public.tenants t ON t.id = c.tenant_id
    WHERE public.portal_phone_key(c.phone) = public.portal_phone_key(_phone)
      AND (_slug IS NULL OR t.slug = _slug)
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
