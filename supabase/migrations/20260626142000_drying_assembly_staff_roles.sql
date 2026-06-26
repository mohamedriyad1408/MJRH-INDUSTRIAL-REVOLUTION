-- Staff role/station support for drying and assembly.
DO $$ BEGIN
  ALTER TYPE public.workstation ADD VALUE IF NOT EXISTS 'drying_assembly';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.job_role ADD VALUE IF NOT EXISTS 'assembly_clerk';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO public.operation_process_catalog (business_type, process_key, process_name, domain, actor_roles, required_data, output_contract)
VALUES ('laundry','assembly_photo_search','تصوير وبحث عن قطعة في صور الطلب','quality',ARRAY['owner','ops_manager','employee'],ARRAY['tenant_id','branch_id','service_unit_id','photo'], '{"cash_impact":false,"journal_required":false,"appears_in_report":true,"photo_search":true}'::jsonb)
ON CONFLICT (business_type, process_key) DO UPDATE
SET process_name = EXCLUDED.process_name,
    domain = EXCLUDED.domain,
    actor_roles = EXCLUDED.actor_roles,
    required_data = EXCLUDED.required_data,
    output_contract = EXCLUDED.output_contract,
    is_active = true;
