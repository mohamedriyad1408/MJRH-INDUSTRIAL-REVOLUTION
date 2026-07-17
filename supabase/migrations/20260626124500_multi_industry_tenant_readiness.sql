-- Multi-industry readiness: MJRH core can provision laundries now and other commercial/industrial tenants later.

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'laundry';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS industry_profile jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.operation_process_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type text NOT NULL DEFAULT 'generic',
  process_key text NOT NULL,
  process_name text NOT NULL,
  domain text NOT NULL DEFAULT 'operations',
  actor_roles text[] NOT NULL DEFAULT ARRAY[]::text[],
  required_data text[] NOT NULL DEFAULT ARRAY['tenant_id','branch_id']::text[],
  output_contract jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_type, process_key)
);

ALTER TABLE public.operation_process_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS operation_process_catalog_select ON public.operation_process_catalog;
CREATE POLICY operation_process_catalog_select ON public.operation_process_catalog
FOR SELECT TO authenticated USING (true);

INSERT INTO public.operation_process_catalog (business_type, process_key, process_name, domain, actor_roles, required_data, output_contract)
VALUES
('generic','order_created','إنشاء عملية/طلب','sales',ARRAY['owner','ops_manager','cs_manager','employee'],ARRAY['tenant_id','branch_id','customer_id'], '{"cash_impact":false,"journal_required":false,"appears_in_report":true}'::jsonb),
('generic','invoice_finalized','اعتماد فاتورة','sales',ARRAY['owner','ops_manager','cs_manager'],ARRAY['tenant_id','branch_id','source_id'], '{"cash_impact":false,"journal_required":false,"appears_in_report":true,"notification_optional":true}'::jsonb),
('generic','payment_recorded','تسجيل تحصيل','finance',ARRAY['owner','ops_manager','cs_manager','employee'],ARRAY['tenant_id','branch_id','cash_account_id','amount'], '{"cash_impact":true,"journal_required":true,"appears_in_report":true}'::jsonb),
('generic','expense_created','تسجيل مصروف','finance',ARRAY['owner','ops_manager'],ARRAY['tenant_id','branch_id','amount'], '{"cash_impact":"depends_on_status","journal_required":true,"appears_in_report":true}'::jsonb),
('generic','inventory_movement','حركة مخزون','inventory',ARRAY['owner','ops_manager','employee'],ARRAY['tenant_id','branch_id','item_id','qty'], '{"cash_impact":false,"journal_required":"depends_on_type","appears_in_report":true}'::jsonb),
('generic','cash_transfer','تحويل بين خزن','finance',ARRAY['owner','ops_manager'],ARRAY['tenant_id','branch_id','cash_account_id','amount'], '{"cash_impact":true,"journal_required":true,"appears_in_report":true,"not_income_or_expense":true}'::jsonb),
('laundry','piece_reclean_reported','تسجيل مرتجع تنظيف','quality',ARRAY['owner','ops_manager','employee'],ARRAY['tenant_id','branch_id','service_unit_id'], '{"cash_impact":false,"journal_required":false,"appears_in_report":true,"notification_optional":true}'::jsonb),
('laundry','qc_issue_reported','تسجيل مشكلة جودة','quality',ARRAY['owner','ops_manager','employee'],ARRAY['tenant_id','branch_id','service_unit_id'], '{"cash_impact":false,"journal_required":false,"appears_in_report":true,"notification_optional":true}'::jsonb)
ON CONFLICT (business_type, process_key) DO UPDATE
SET process_name = EXCLUDED.process_name,
    domain = EXCLUDED.domain,
    actor_roles = EXCLUDED.actor_roles,
    required_data = EXCLUDED.required_data,
    output_contract = EXCLUDED.output_contract,
    is_active = true;

CREATE OR REPLACE VIEW public.tenant_bootstrap_health AS
SELECT
  t.id AS tenant_id,
  t.name AS tenant_name,
  t.business_type,
  EXISTS (SELECT 1 FROM public.app_settings s WHERE s.tenant_id = t.id) AS has_settings,
  EXISTS (SELECT 1 FROM public.branches b WHERE b.tenant_id = t.id AND b.is_active) AS has_branch,
  EXISTS (SELECT 1 FROM public.cash_accounts c WHERE c.tenant_id = t.id AND c.is_active) AS has_cash_account,
  EXISTS (SELECT 1 FROM public.chart_accounts ca WHERE ca.tenant_id = t.id AND ca.is_active) AS has_chart_accounts,
  EXISTS (SELECT 1 FROM public.employees e WHERE e.tenant_id = t.id AND e.is_active) AS has_employee,
  CASE WHEN t.business_type = 'laundry' THEN EXISTS (SELECT 1 FROM public.service_items si WHERE si.tenant_id = t.id AND si.is_active) ELSE true END AS has_catalog,
  (
    EXISTS (SELECT 1 FROM public.app_settings s WHERE s.tenant_id = t.id)
    AND EXISTS (SELECT 1 FROM public.branches b WHERE b.tenant_id = t.id AND b.is_active)
    AND EXISTS (SELECT 1 FROM public.cash_accounts c WHERE c.tenant_id = t.id AND c.is_active)
    AND EXISTS (SELECT 1 FROM public.chart_accounts ca WHERE ca.tenant_id = t.id AND ca.is_active)
    AND EXISTS (SELECT 1 FROM public.employees e WHERE e.tenant_id = t.id AND e.is_active)
    AND (t.business_type <> 'laundry' OR EXISTS (SELECT 1 FROM public.service_items si WHERE si.tenant_id = t.id AND si.is_active))
  ) AS is_ready
FROM public.tenants t;

GRANT SELECT ON public.tenant_bootstrap_health TO authenticated;

-- Make default seeding explicit about generic tenants too. Laundry receives service catalog; generic tenants still receive settings/branch/cash/chart.
CREATE OR REPLACE FUNCTION public.seed_tenant_defaults(_tenant_id uuid, _tenant_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE btype text;
BEGIN
  SELECT COALESCE(business_type, 'laundry') INTO btype FROM public.tenants WHERE id = _tenant_id;

  INSERT INTO public.app_settings (tenant_id, business_name)
  VALUES (_tenant_id, COALESCE(_tenant_name, 'Business'))
  ON CONFLICT (tenant_id) DO NOTHING;

  PERFORM public.ensure_default_branch_for(_tenant_id, _tenant_name);
  PERFORM public.ensure_default_cash_account_for(_tenant_id);
  PERFORM public.ensure_default_chart_accounts_for(_tenant_id);

  IF btype = 'laundry' THEN
    INSERT INTO public.service_items (tenant_id, name, service_type, unit_price, is_active, category_id)
    SELECT _tenant_id, x.name, x.service_type, x.unit_price, x.is_active, NULL
    FROM (
      SELECT DISTINCT ON (name) name, service_type, unit_price, is_active
      FROM public.service_items
      WHERE tenant_id IS NOT NULL AND tenant_id <> _tenant_id
      ORDER BY name, created_at DESC
    ) x
    WHERE NOT EXISTS (SELECT 1 FROM public.service_items s WHERE s.tenant_id = _tenant_id AND s.name = x.name);
  END IF;
END;
$$;
