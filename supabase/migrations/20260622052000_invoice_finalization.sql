ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS invoice_finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_notified_at timestamptz;
