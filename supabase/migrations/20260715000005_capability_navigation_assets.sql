-- Sprint 1 — Capability Asset Foundation: Navigation Assets
-- Additive migration only. No historical Dry Tech business data is modified here.

-- ============================================================================
-- 1) Capability-owned navigation asset registry
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_navigation_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ownership_level text NOT NULL CHECK (ownership_level IN ('CORE','CAPABILITY','TEMPLATE')),
  owner_key text NOT NULL,
  asset_key text NOT NULL,
  group_key text NOT NULL DEFAULT 'main',
  parent_asset_key text,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  route text NOT NULL,
  icon text NOT NULL DEFAULT 'LayoutDashboard',
  required_roles text[] NOT NULL DEFAULT ARRAY['owner','ops_manager','cs_manager','employee'],
  required_permissions text[] NOT NULL DEFAULT ARRAY[]::text[],
  visibility_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ownership_level, owner_key, asset_key)
);

COMMENT ON TABLE public.core_navigation_assets IS 'CORE/CAPABILITY/TEMPLATE owned navigation asset definitions. These are source assets, not tenant runtime navigation.';
COMMENT ON COLUMN public.core_navigation_assets.ownership_level IS 'CORE = every installation; CAPABILITY = reusable business capability; TEMPLATE = template-specific initial generation asset.';
COMMENT ON COLUMN public.core_navigation_assets.owner_key IS 'core, capability key, or template slug depending on ownership_level.';

CREATE INDEX IF NOT EXISTS idx_core_navigation_assets_owner ON public.core_navigation_assets(ownership_level, owner_key) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_core_navigation_assets_group ON public.core_navigation_assets(group_key, sort_order) WHERE is_active;

ALTER TABLE public.core_navigation_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_navigation_assets_read ON public.core_navigation_assets;
CREATE POLICY core_navigation_assets_read ON public.core_navigation_assets
FOR SELECT TO authenticated
USING (is_active = true);

-- Mutations are intentionally service/admin-only through migrations or future governed admin tooling.

-- ============================================================================
-- 2) Organization runtime navigation ownership metadata
-- ============================================================================

ALTER TABLE public.core_navigation_items
  ADD COLUMN IF NOT EXISTS ownership_level text NOT NULL DEFAULT 'ORGANIZATION' CHECK (ownership_level IN ('ORGANIZATION')),
  ADD COLUMN IF NOT EXISTS source_asset_id uuid REFERENCES public.core_navigation_assets(id),
  ADD COLUMN IF NOT EXISTS source_ownership_level text CHECK (source_ownership_level IN ('CORE','CAPABILITY','TEMPLATE')),
  ADD COLUMN IF NOT EXISTS source_owner_key text,
  ADD COLUMN IF NOT EXISTS required_permissions text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS visibility_rules jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON TABLE public.core_navigation_items IS 'ORGANIZATION-owned generated runtime navigation items. Generated from core_navigation_assets or explicit organization configuration.';
COMMENT ON COLUMN public.core_navigation_items.ownership_level IS 'Always ORGANIZATION: tenant-specific generated runtime data.';

-- ============================================================================
-- 3) Navigation asset updated_at trigger
-- ============================================================================

DROP TRIGGER IF EXISTS trg_core_navigation_assets_updated ON public.core_navigation_assets;
CREATE TRIGGER trg_core_navigation_assets_updated
BEFORE UPDATE ON public.core_navigation_assets
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

-- ============================================================================
-- 4) Seed generic CORE and CAPABILITY navigation assets
-- ============================================================================

INSERT INTO public.core_navigation_assets (ownership_level, owner_key, asset_key, group_key, label_ar, label_en, route, icon, required_roles, sort_order, metadata)
VALUES
  ('CORE','core','dashboard','main','لوحة القيادة','Dashboard','/dashboard','LayoutDashboard',ARRAY['owner','ops_manager','cs_manager'],10,'{"reason":"core_runtime_entry"}'::jsonb),
  ('CORE','core','today','main','مركز اليوم','Today Center','/today','CalendarCheck',ARRAY['owner','ops_manager','cs_manager'],20,'{"reason":"core_daily_entry"}'::jsonb),
  ('CORE','core','search','main','البحث الموحد','Unified Search','/search','Search',ARRAY['owner','ops_manager','cs_manager','employee','courier'],30,'{}'::jsonb),
  ('CORE','core','settings','admin','الإعدادات','Settings','/settings','Settings',ARRAY['owner'],900,'{}'::jsonb),
  ('CORE','core','help','admin','الدليل','Help','/help','HelpCircle',ARRAY['owner','ops_manager','cs_manager','employee','courier'],910,'{}'::jsonb)
ON CONFLICT (ownership_level, owner_key, asset_key) DO UPDATE SET
  group_key=EXCLUDED.group_key,label_ar=EXCLUDED.label_ar,label_en=EXCLUDED.label_en,route=EXCLUDED.route,icon=EXCLUDED.icon,required_roles=EXCLUDED.required_roles,sort_order=EXCLUDED.sort_order,metadata=EXCLUDED.metadata,is_active=true;

INSERT INTO public.core_navigation_assets (ownership_level, owner_key, asset_key, group_key, label_ar, label_en, route, icon, required_roles, sort_order, metadata)
VALUES
  ('CAPABILITY','orders','orders_list','commerce','كل العمليات','Orders','/orders','ListOrdered',ARRAY['owner','ops_manager','cs_manager'],100,'{}'::jsonb),
  ('CAPABILITY','orders','orders_new','commerce','عملية جديدة','New Order','/orders/new','PlusCircle',ARRAY['owner','cs_manager'],110,'{}'::jsonb),
  ('CAPABILITY','crm','customers','customers','العملاء','Customers','/customers','Users',ARRAY['owner','cs_manager'],120,'{}'::jsonb),
  ('CAPABILITY','crm','crm','customers','CRM والولاء','CRM','/crm','HeartHandshake',ARRAY['owner','ops_manager','cs_manager'],130,'{}'::jsonb),
  ('CAPABILITY','crm','customer_care','customers','رعاية العملاء','Customer Care','/customer-care','HeartHandshake',ARRAY['owner','ops_manager','cs_manager'],140,'{}'::jsonb),
  ('CAPABILITY','catalog','services','catalog','كتالوج الخدمات','Services Catalog','/services','Tag',ARRAY['owner','cs_manager'],150,'{}'::jsonb),
  ('CAPABILITY','catalog','inventory','catalog','المخزون','Inventory','/inventory','Boxes',ARRAY['owner','ops_manager'],160,'{}'::jsonb),
  ('CAPABILITY','catalog','branches','catalog','المواقع والفروع','Branches','/branches','Building2',ARRAY['owner'],170,'{}'::jsonb),
  ('CAPABILITY','workflow','work_orders','operations','طلبات العمل','Work Orders','/work-orders','Layers',ARRAY['owner','ops_manager','cs_manager','employee'],200,'{}'::jsonb),
  ('CAPABILITY','workflow','operations','operations','لوحة التشغيل','Operations','/ops','ShieldCheck',ARRAY['owner','ops_manager'],210,'{}'::jsonb),
  ('CAPABILITY','workflow','daily_operations','operations','تشغيل اليوم','Daily Operations','/daily-operations','PlayCircle',ARRAY['owner','ops_manager','cs_manager'],220,'{}'::jsonb),
  ('CAPABILITY','workflow','issues','operations','التعثرات','Issues','/issues','AlertTriangle',ARRAY['owner','ops_manager','cs_manager'],230,'{}'::jsonb),
  ('CAPABILITY','workflow','system_health','operations','سلامة النظام','System Health','/system-health','ShieldCheck',ARRAY['owner','ops_manager'],240,'{}'::jsonb),
  ('CAPABILITY','field_service','pickups','field','طلبات الاستلام','Pickups','/pickups','Inbox',ARRAY['owner','ops_manager','cs_manager'],300,'{}'::jsonb),
  ('CAPABILITY','field_service','pickups_new','field','استلام جديد','New Pickup','/pickups/new','PlusCircle',ARRAY['owner','cs_manager'],310,'{}'::jsonb),
  ('CAPABILITY','field_service','driver','field','السائق','Driver','/driver','Truck',ARRAY['owner','ops_manager','courier'],320,'{}'::jsonb),
  ('CAPABILITY','field_service','live_map','field','الخريطة والفريق','Live Map','/live-map','Navigation',ARRAY['owner','ops_manager'],330,'{}'::jsonb),
  ('CAPABILITY','accounting','finance','finance','المالية','Finance','/finance','Wallet',ARRAY['owner','ops_manager','cs_manager'],400,'{}'::jsonb),
  ('CAPABILITY','accounting','accounting','finance','المحاسبة والخزنة','Accounting','/accounting','Calculator',ARRAY['owner','ops_manager'],410,'{}'::jsonb),
  ('CAPABILITY','accounting','ledger','finance','القيود','Ledger','/ledger','BookOpenCheck',ARRAY['owner'],420,'{}'::jsonb),
  ('CAPABILITY','accounting','receivables','finance','الذمم','Receivables','/receivables','UsersRound',ARRAY['owner','ops_manager','cs_manager'],430,'{}'::jsonb),
  ('CAPABILITY','accounting','cash_closing','finance','إقفال الخزنة','Cash Closing','/cash-closing','LockKeyhole',ARRAY['owner','ops_manager'],440,'{}'::jsonb),
  ('CAPABILITY','accounting','budgets','finance','الميزانيات','Budgets','/budgets','Target',ARRAY['owner'],450,'{}'::jsonb),
  ('CAPABILITY','reporting','reports','reports','التقارير والذكاء','Reports','/reports','BarChart3',ARRAY['owner','ops_manager','cs_manager'],500,'{}'::jsonb),
  ('CAPABILITY','reporting','report_builder','reports','منشئ التقارير','Report Builder','/reports/builder','BarChart3',ARRAY['owner','ops_manager'],510,'{}'::jsonb),
  ('CAPABILITY','reporting','executive','reports','لوحة التنفيذيين','Executive Dashboard','/executive','BarChart3',ARRAY['owner'],520,'{}'::jsonb),
  ('CAPABILITY','hr','staff','people','الموظفون','Staff','/staff','BriefcaseBusiness',ARRAY['owner','ops_manager','cs_manager'],600,'{}'::jsonb),
  ('CAPABILITY','hr','attendance','people','الحضور','Attendance','/staff/attendance','Clock',ARRAY['owner','ops_manager','cs_manager'],610,'{}'::jsonb),
  ('CAPABILITY','hr','scorecard','people','الأداء','Scorecard','/staff/scorecard','Target',ARRAY['owner','ops_manager','cs_manager'],620,'{}'::jsonb),
  ('CAPABILITY','hr','staff_requests','people','الطلبات والسلف','Staff Requests','/staff/requests','Inbox',ARRAY['owner','ops_manager','cs_manager'],630,'{}'::jsonb),
  ('CAPABILITY','hr','salaries','people','الرواتب','Salaries','/staff/salaries','Banknote',ARRAY['owner'],640,'{}'::jsonb),
  ('CAPABILITY','hr','schedule','people','الجدول والإجازات','Schedule & Leaves','/staff/schedule','CalendarDays',ARRAY['owner','ops_manager','cs_manager'],650,'{}'::jsonb)
ON CONFLICT (ownership_level, owner_key, asset_key) DO UPDATE SET
  group_key=EXCLUDED.group_key,label_ar=EXCLUDED.label_ar,label_en=EXCLUDED.label_en,route=EXCLUDED.route,icon=EXCLUDED.icon,required_roles=EXCLUDED.required_roles,sort_order=EXCLUDED.sort_order,metadata=EXCLUDED.metadata,is_active=true;

-- Laundry template navigation assets. These are TEMPLATE-owned configuration, not Core logic.
INSERT INTO public.core_navigation_assets (ownership_level, owner_key, asset_key, group_key, label_ar, label_en, route, icon, required_roles, sort_order, metadata)
VALUES
  ('TEMPLATE','laundry','station_reception','laundry_operations','الاستقبال','Reception','/stations/reception','ClipboardCheck',ARRAY['owner','ops_manager','cs_manager','employee','receptionist'],700,'{"template":"laundry"}'::jsonb),
  ('TEMPLATE','laundry','station_intake','laundry_operations','الاستلام','Intake','/stations/intake','Inbox',ARRAY['owner','ops_manager','cs_manager','employee','intake_rep'],710,'{"template":"laundry"}'::jsonb),
  ('TEMPLATE','laundry','station_sorting','laundry_operations','الفرز والتصنيف','Sorting','/stations/sorting','Tags',ARRAY['owner','ops_manager','employee','sorter'],720,'{"template":"laundry"}'::jsonb),
  ('TEMPLATE','laundry','station_cleaning','laundry_operations','التنظيف والمعالجة','Cleaning','/stations/cleaning','Sparkles',ARRAY['owner','ops_manager','employee','cleaning_tech'],730,'{"template":"laundry"}'::jsonb),
  ('TEMPLATE','laundry','station_drying_assembly','laundry_operations','التجفيف والتجميع','Drying & Assembly','/stations/drying-assembly','Wind',ARRAY['owner','ops_manager','employee','assembly_tech'],740,'{"template":"laundry"}'::jsonb),
  ('TEMPLATE','laundry','station_ironing','laundry_operations','التشطيب والكي','Finishing / Ironing','/stations/ironing','Shirt',ARRAY['owner','ops_manager','employee','ironing_tech'],750,'{"template":"laundry"}'::jsonb),
  ('TEMPLATE','laundry','station_packing','laundry_operations','التغليف','Packing','/stations/packing','Package',ARRAY['owner','ops_manager','employee','packer'],760,'{"template":"laundry"}'::jsonb),
  ('TEMPLATE','laundry','station_qc','laundry_operations','مراقبة الجودة','Quality Control','/stations/qc','ShieldCheck',ARRAY['owner','ops_manager','employee','qc_tech'],770,'{"template":"laundry"}'::jsonb),
  ('TEMPLATE','laundry','station_cs','laundry_operations','خدمة العملاء','Customer Service Station','/stations/cs','Headphones',ARRAY['owner','ops_manager','cs_manager','employee','cs_rep'],780,'{"template":"laundry"}'::jsonb),
  ('TEMPLATE','laundry','ironing_payroll','laundry_operations','رواتب الكي','Ironing Payroll','/staff/ironing-payroll','Shirt',ARRAY['owner'],790,'{"template":"laundry"}'::jsonb)
ON CONFLICT (ownership_level, owner_key, asset_key) DO UPDATE SET
  group_key=EXCLUDED.group_key,label_ar=EXCLUDED.label_ar,label_en=EXCLUDED.label_en,route=EXCLUDED.route,icon=EXCLUDED.icon,required_roles=EXCLUDED.required_roles,sort_order=EXCLUDED.sort_order,metadata=EXCLUDED.metadata,is_active=true;

-- ============================================================================
-- 5) Generate organization runtime navigation from assets
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_navigation_assets_for_tenant(
  _tenant_id uuid,
  _template_slug text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  effective_template text;
  inserted_count int := 0;
  updated_count int := 0;
BEGIN
  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id is required';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.can_access_tenant(_tenant_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(_template_slug, template_slug, raw_setup->>'template_slug', 'blank_operating_system')
  INTO effective_template
  FROM public.core_setup_profiles
  WHERE tenant_id = _tenant_id;

  effective_template := COALESCE(effective_template, _template_slug, 'blank_operating_system');

  WITH source_assets AS (
    SELECT *
    FROM public.core_navigation_assets a
    WHERE a.is_active
      AND (
        a.ownership_level IN ('CORE','CAPABILITY')
        OR (a.ownership_level = 'TEMPLATE' AND a.owner_key = effective_template)
      )
  ), upserted AS (
    INSERT INTO public.core_navigation_items(
      tenant_id, department_key, item_key, label_ar, label_en, route, icon,
      required_roles, required_permissions, visibility_rules, sort_order, is_active,
      config, source_asset_id, source_ownership_level, source_owner_key, ownership_level
    )
    SELECT
      _tenant_id,
      s.group_key,
      s.asset_key,
      s.label_ar,
      s.label_en,
      s.route,
      s.icon,
      s.required_roles,
      s.required_permissions,
      s.visibility_rules,
      s.sort_order,
      true,
      s.metadata || jsonb_build_object('generated_from_navigation_asset', true, 'source_asset_key', s.asset_key),
      s.id,
      s.ownership_level,
      s.owner_key,
      'ORGANIZATION'
    FROM source_assets s
    ON CONFLICT (tenant_id, item_key) DO UPDATE SET
      department_key = EXCLUDED.department_key,
      label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      route = EXCLUDED.route,
      icon = EXCLUDED.icon,
      required_roles = EXCLUDED.required_roles,
      required_permissions = EXCLUDED.required_permissions,
      visibility_rules = EXCLUDED.visibility_rules,
      sort_order = EXCLUDED.sort_order,
      is_active = true,
      config = EXCLUDED.config,
      source_asset_id = EXCLUDED.source_asset_id,
      source_ownership_level = EXCLUDED.source_ownership_level,
      source_owner_key = EXCLUDED.source_owner_key
    RETURNING (xmax = 0) AS inserted
  )
  SELECT
    COUNT(*) FILTER (WHERE inserted),
    COUNT(*) FILTER (WHERE NOT inserted)
  INTO inserted_count, updated_count
  FROM upserted;

  RETURN jsonb_build_object(
    'tenant_id', _tenant_id,
    'template_slug', effective_template,
    'inserted', COALESCE(inserted_count,0),
    'updated', COALESCE(updated_count,0),
    'total_navigation_items', (SELECT count(*) FROM public.core_navigation_items WHERE tenant_id = _tenant_id AND is_active)
  );
END;
$$;

COMMENT ON FUNCTION public.apply_navigation_assets_for_tenant(uuid, text) IS 'Generates ORGANIZATION-owned runtime navigation from CORE/CAPABILITY/TEMPLATE navigation assets. No industry logic exists in this function.';

GRANT EXECUTE ON FUNCTION public.apply_navigation_assets_for_tenant(uuid, text) TO authenticated;
