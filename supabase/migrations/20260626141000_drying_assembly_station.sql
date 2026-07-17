-- Laundry-specific drying and assembly station between cleaning and ironing.

ALTER TABLE public.service_units ADD COLUMN IF NOT EXISTS label_status text NOT NULL DEFAULT 'labeled'
  CHECK (label_status IN ('labeled','missing_label','unclear_label'));
ALTER TABLE public.service_units ADD COLUMN IF NOT EXISTS assembly_checked_at timestamptz;
ALTER TABLE public.service_units ADD COLUMN IF NOT EXISTS assembly_checked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.service_units ADD COLUMN IF NOT EXISTS assembly_notes text;

CREATE INDEX IF NOT EXISTS service_units_assembly_idx ON public.service_units(tenant_id, current_stage, label_status, updated_at DESC);

INSERT INTO public.operation_process_catalog (business_type, process_key, process_name, domain, actor_roles, required_data, output_contract)
VALUES
('laundry','drying_assembly_started','بدء التجفيف والتجميع','production',ARRAY['owner','ops_manager','employee'],ARRAY['tenant_id','branch_id','service_unit_id'], '{"cash_impact":false,"journal_required":false,"appears_in_report":true}'::jsonb),
('laundry','drying_assembly_completed','إنهاء التجفيف والتجميع','production',ARRAY['owner','ops_manager','employee'],ARRAY['tenant_id','branch_id','service_unit_id'], '{"cash_impact":false,"journal_required":false,"appears_in_report":true}'::jsonb),
('laundry','label_issue_reported','تسجيل مشكلة مارك/ليبل','quality',ARRAY['owner','ops_manager','employee'],ARRAY['tenant_id','branch_id','service_unit_id'], '{"cash_impact":false,"journal_required":false,"appears_in_report":true,"notification_optional":true}'::jsonb)
ON CONFLICT (business_type, process_key) DO UPDATE
SET process_name = EXCLUDED.process_name,
    domain = EXCLUDED.domain,
    actor_roles = EXCLUDED.actor_roles,
    required_data = EXCLUDED.required_data,
    output_contract = EXCLUDED.output_contract,
    is_active = true;

CREATE OR REPLACE VIEW public.drying_assembly_queue AS
SELECT
  su.id,
  su.tenant_id,
  o.branch_id,
  su.order_id,
  su.label_code,
  su.name,
  su.garment_type,
  su.service_type,
  su.photo_url,
  su.current_stage,
  su.label_status,
  su.needs_reclean,
  su.reclean_reason,
  su.assembly_checked_at,
  su.assembly_notes,
  o.order_number,
  o.status AS order_status,
  c.full_name AS customer_name,
  c.phone AS customer_phone,
  su.updated_at,
  su.created_at
FROM public.service_units su
JOIN public.orders o ON o.id = su.order_id
LEFT JOIN public.customers c ON c.id = o.customer_id
WHERE su.service_type IN ('both','cleaning')
  AND su.current_stage IN ('cleaning','cleaning_done','drying_assembly','qc_failed')
  AND COALESCE(su.status,'') <> 'cancelled'
  AND o.status <> 'cancelled';

GRANT SELECT ON public.drying_assembly_queue TO authenticated;
