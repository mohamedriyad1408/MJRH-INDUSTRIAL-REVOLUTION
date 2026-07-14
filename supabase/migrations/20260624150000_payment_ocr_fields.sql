-- OCR metadata for customer InstaPay proof verification.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_ocr_text text,
  ADD COLUMN IF NOT EXISTS payment_ocr_provider text,
  ADD COLUMN IF NOT EXISTS payment_ocr_confidence numeric(6,3),
  ADD COLUMN IF NOT EXISTS payment_ocr_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_ocr_error text;
