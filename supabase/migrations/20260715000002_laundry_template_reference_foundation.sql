-- MJRH Reference Organization Foundation
-- Finalizes the Laundry Template as a configuration package and keeps Dry Tech
-- generation reproducible through the Platform Generator.

-- Expand template assets so templates can own operational seed assets without
-- embedding them in the Core Platform.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.core_template_assets'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%asset_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.core_template_assets DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.core_template_assets
  ADD CONSTRAINT core_template_assets_asset_type_check CHECK (
    asset_type IN (
      'department','role','workflow','financial_event','document','form','navigation',
      'service','report','accounting_setup','demo_seed','operational_policy'
    )
  );

-- Mark Laundry as an active template package. This is not Core logic.
INSERT INTO public.core_template_registry (slug, name_ar, name_en, description_ar, description_en, category, status, metadata)
VALUES (
  'laundry',
  'قالب تشغيل مغسلة',
  'Laundry Template',
  'حزمة إعدادات قابلة للاستبدال لتوليد منظمة تشغيل مغسلة من منصة MJRH.',
  'Replaceable configuration package for generating a laundry operating organization from MJRH.',
  'industry_package',
  'active',
  jsonb_build_object(
    'version','1.0.0-reference',
    'core_defaults', false,
    'reference_organization', 'Dry Tech',
    'generated_only', true
  )
)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  metadata = public.core_template_registry.metadata || EXCLUDED.metadata;

WITH tpl AS (
  SELECT id FROM public.core_template_registry WHERE slug = 'laundry'
), departments AS (
  SELECT * FROM (VALUES
    ('customer_service','خدمة العملاء','Customer Service','/cs','Headphones',10),
    ('intake','الاستلام','Intake','/stations/intake','Inbox',20),
    ('sorting','الفرز والتصنيف','Sorting','/stations/sorting','Tags',30),
    ('cleaning','التنظيف والمعالجة','Cleaning','/stations/cleaning','Sparkles',40),
    ('finishing','التشطيب والكي','Finishing','/stations/ironing','Shirt',50),
    ('quality_control','مراقبة الجودة','Quality Control','/stations/qc','ShieldCheck',60),
    ('packing','التغليف','Packing','/stations/packing','Package',70),
    ('delivery','التوصيل','Delivery','/driver','Truck',80),
    ('finance_control','الرقابة المالية','Finance Control','/accounting','Calculator',90),
    ('management','الإدارة','Management','/dashboard','LayoutDashboard',100)
  ) AS x(asset_key, name_ar, name_en, route, icon, sort_order)
)
INSERT INTO public.core_template_assets (template_id, asset_type, asset_key, name_ar, name_en, definition, sort_order)
SELECT tpl.id, 'department', d.asset_key, d.name_ar, d.name_en,
       jsonb_build_object('key', d.asset_key, 'route', d.route, 'icon', d.icon, 'enabled', true), d.sort_order
FROM tpl CROSS JOIN departments d
ON CONFLICT (template_id, asset_type, asset_key) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  definition = EXCLUDED.definition,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

WITH tpl AS (
  SELECT id FROM public.core_template_registry WHERE slug = 'laundry'
), roles AS (
  SELECT * FROM (VALUES
    ('organization_owner','مالك المنظمة','Organization Owner',99,'{"scope":"organization","can_approve_all":true}'::jsonb,10),
    ('operations_lead','قائد التشغيل','Operations Lead',60,'{"scope":"operations","can_assign_work":true}'::jsonb,20),
    ('customer_coordinator','منسق العملاء','Customer Coordinator',30,'{"scope":"customers","can_create_orders":true}'::jsonb,30),
    ('production_actor','منفذ تشغيل','Production Actor',10,'{"scope":"assigned_tasks"}'::jsonb,40),
    ('delivery_actor','منفذ توصيل','Delivery Actor',10,'{"scope":"delivery_tasks"}'::jsonb,50),
    ('finance_operator','مشغل مالي','Finance Operator',40,'{"scope":"financial_events"}'::jsonb,60),
    ('observer','مشاهد','Observer',0,'{"scope":"read_only"}'::jsonb,70)
  ) AS x(asset_key, name_ar, name_en, approval_level, permissions, sort_order)
)
INSERT INTO public.core_template_assets (template_id, asset_type, asset_key, name_ar, name_en, definition, sort_order)
SELECT tpl.id, 'role', r.asset_key, r.name_ar, r.name_en,
       jsonb_build_object('key', r.asset_key, 'approval_level', r.approval_level, 'permissions', r.permissions), r.sort_order
FROM tpl CROSS JOIN roles r
ON CONFLICT (template_id, asset_type, asset_key) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  definition = EXCLUDED.definition,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

WITH tpl AS (
  SELECT id FROM public.core_template_registry WHERE slug = 'laundry'
)
INSERT INTO public.core_template_assets (template_id, asset_type, asset_key, name_ar, name_en, definition, sort_order)
SELECT tpl.id, 'workflow', 'laundry_order_lifecycle', 'دورة تشغيل طلب مغسلة', 'Laundry Order Lifecycle',
  jsonb_build_object(
    'style','template_defined',
    'states', jsonb_build_array('received','intake','sorting','cleaning','finishing','quality_control','packing','ready','out_for_delivery','delivered'),
    'transitions', jsonb_build_array(
      jsonb_build_array('received','intake'),
      jsonb_build_array('intake','sorting'),
      jsonb_build_array('sorting','cleaning'),
      jsonb_build_array('cleaning','finishing'),
      jsonb_build_array('finishing','quality_control'),
      jsonb_build_array('quality_control','packing'),
      jsonb_build_array('packing','ready'),
      jsonb_build_array('ready','out_for_delivery'),
      jsonb_build_array('out_for_delivery','delivered')
    ),
    'documents', jsonb_build_array('intake_receipt','delivery_note','payment_receipt'),
    'sla_hours', 48
  ),
  10
FROM tpl
ON CONFLICT (template_id, asset_type, asset_key) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  definition = EXCLUDED.definition,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

WITH tpl AS (
  SELECT id FROM public.core_template_registry WHERE slug = 'laundry'
), financial_events AS (
  SELECT * FROM (VALUES
    ('transaction','معاملة','Transaction','{"approval_required":false}'::jsonb,10),
    ('adjustment','تسوية','Adjustment','{"approval_required":true}'::jsonb,20),
    ('allocation','تخصيص','Allocation','{"approval_required":false}'::jsonb,30),
    ('settlement','إقفال/تسوية نهائية','Settlement','{"approval_required":true}'::jsonb,40),
    ('approval','اعتماد','Approval','{"approval_required":true}'::jsonb,50),
    ('transfer','تحويل','Transfer','{"approval_required":true}'::jsonb,60)
  ) AS x(asset_key, name_ar, name_en, definition, sort_order)
)
INSERT INTO public.core_template_assets (template_id, asset_type, asset_key, name_ar, name_en, definition, sort_order)
SELECT tpl.id, 'financial_event', f.asset_key, f.name_ar, f.name_en, f.definition, f.sort_order
FROM tpl CROSS JOIN financial_events f
ON CONFLICT (template_id, asset_type, asset_key) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  definition = EXCLUDED.definition,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

WITH tpl AS (
  SELECT id FROM public.core_template_registry WHERE slug = 'laundry'
), services AS (
  SELECT * FROM (VALUES
    ('shirt_wash_press','غسيل وكي قميص','Shirt Wash & Press','both',35,'ملابس رجالي',10),
    ('trousers_press','كي بنطلون','Trousers Press','ironing',20,'ملابس رجالي',20),
    ('suit_clean_press','تنظيف وكي بدلة','Suit Clean & Press','both',120,'ملابس رجالي',30),
    ('dress_clean','تنظيف فستان','Dress Cleaning','cleaning',95,'ملابس حريمي',40),
    ('abaya_clean_press','تنظيف وكي عباية','Abaya Clean & Press','both',70,'ملابس حريمي',50),
    ('bedsheet_wash','غسيل ملاية سرير','Bed Sheet Wash','cleaning',45,'مفروشات',60),
    ('duvet_clean','تنظيف لحاف','Duvet Cleaning','cleaning',150,'مفروشات',70),
    ('curtain_clean_meter','تنظيف ستائر بالمتر','Curtain Cleaning / Meter','cleaning',55,'ستائر',80),
    ('carpet_clean_meter','تنظيف سجاد بالمتر','Carpet Cleaning / Meter','cleaning',80,'سجاد',90),
    ('express_fee','رسوم خدمة عاجلة','Express Service Fee','both',50,'إضافات',100)
  ) AS x(asset_key, name_ar, name_en, service_type, unit_price, category, sort_order)
)
INSERT INTO public.core_template_assets (template_id, asset_type, asset_key, name_ar, name_en, definition, sort_order)
SELECT tpl.id, 'service', s.asset_key, s.name_ar, s.name_en,
       jsonb_build_object('service_type', s.service_type, 'unit_price', s.unit_price, 'category', s.category, 'is_active', true), s.sort_order
FROM tpl CROSS JOIN services s
ON CONFLICT (template_id, asset_type, asset_key) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  definition = EXCLUDED.definition,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

WITH tpl AS (
  SELECT id FROM public.core_template_registry WHERE slug = 'laundry'
), reports AS (
  SELECT * FROM (VALUES
    ('daily_operations','تقرير التشغيل اليومي','Daily Operations Report','{"metrics":["orders_by_status","late_orders","station_load"]}'::jsonb,10),
    ('financial_summary','ملخص مالي','Financial Summary','{"metrics":["revenue","receivables","cash_movements"]}'::jsonb,20),
    ('quality_exceptions','تقرير الجودة والتعثرات','Quality Exceptions','{"metrics":["reclean","qc_issues","delays"]}'::jsonb,30)
  ) AS x(asset_key, name_ar, name_en, definition, sort_order)
)
INSERT INTO public.core_template_assets (template_id, asset_type, asset_key, name_ar, name_en, definition, sort_order)
SELECT tpl.id, 'report', r.asset_key, r.name_ar, r.name_en, r.definition, r.sort_order
FROM tpl CROSS JOIN reports r
ON CONFLICT (template_id, asset_type, asset_key) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  definition = EXCLUDED.definition,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
