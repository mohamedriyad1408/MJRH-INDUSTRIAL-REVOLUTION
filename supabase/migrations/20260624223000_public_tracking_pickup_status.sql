-- Public tracking page with pickup/payment context using opaque order token.
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
  LEFT JOIN p ON p.converted_order_id = o.id
  WHERE o.public_token = _token
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_order_by_token(uuid) TO anon, authenticated;
