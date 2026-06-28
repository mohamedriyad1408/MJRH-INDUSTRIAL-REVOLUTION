-- MJRH V2 — Add delivered_at timestamp used by delivery confirmation
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
CREATE INDEX IF NOT EXISTS orders_delivered_at_idx ON public.orders(tenant_id, delivered_at DESC) WHERE delivered_at IS NOT NULL;
