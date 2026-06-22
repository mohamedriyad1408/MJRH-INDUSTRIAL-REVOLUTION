-- Payment proof for InstaPay / wallet transfers.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_proof_url text,
  ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_proof_uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS payment_proofs_staff_read ON storage.objects;
CREATE POLICY payment_proofs_staff_read ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS payment_proofs_staff_insert ON storage.objects;
CREATE POLICY payment_proofs_staff_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS payment_proofs_staff_update ON storage.objects;
CREATE POLICY payment_proofs_staff_update ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'payment-proofs')
WITH CHECK (bucket_id = 'payment-proofs');
