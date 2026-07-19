#!/usr/bin/env node
// MJRH — Reference Organization Generator
// Generates Dry Tech from the Laundry Template through the Platform Generator path.
//
// Dry-run:
//   SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... node scripts/generate-reference-dry-tech.mjs
// Apply:
//   REFERENCE_APPLY=1 REFERENCE_RESET=1 SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... node scripts/generate-reference-dry-tech.mjs

import fs from "node:fs";

function readProjectRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
  try {
    const toml = fs.readFileSync("supabase/config.toml", "utf8");
    const m = toml.match(/project_id\s*=\s*"([^"]+)"/);
    if (m) return m[1];
  } catch {}
  return null;
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = readProjectRef();
const apply = process.env.REFERENCE_APPLY === "1" || process.argv.includes("--apply");
const reset = process.env.REFERENCE_RESET === "1" || process.argv.includes("--reset");
const slug = process.env.DRY_TECH_SLUG || "dry-tech-reference";
const name = process.env.DRY_TECH_NAME || "Dry Tech";
const ownerUserId = process.env.DRY_TECH_OWNER_USER_ID || null;

if (!token || !ref) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF.");
  process.exit(1);
}

const maybeBegin = apply ? "" : "BEGIN;";
const maybeRollback = apply ? "" : "ROLLBACK;";
const ownerExpr = ownerUserId ? `'${ownerUserId}'::uuid` : "NULL::uuid";
const safeSlug = slug.replace(/'/g, "''");
const safeName = name.replace(/'/g, "''");

const sql = `
${maybeBegin}
DO $$
DECLARE
  owner_id uuid := ${ownerExpr};
  existing_tenant record;
  tid uuid;
  v_template_id uuid;
  setup jsonb;
  assets jsonb;
  main_branch_id uuid;
  hub_branch_id uuid;
  svc record;
  svc_ids uuid[] := ARRAY[]::uuid[];
  employee_reception uuid;
  employee_ops uuid;
  employee_sorter uuid;
  employee_cleaning uuid;
  employee_ironing uuid;
  employee_qc uuid;
  employee_packing uuid;
  employee_driver uuid;
  customer_ids uuid[] := ARRAY[]::uuid[];
  c record;
  oid uuid;
  oi uuid;
  unit_no int;
  idx int;
  statuses text[] := ARRAY['received','cleaning','ironing','packing','ready','out_for_delivery','delivered','ready','cleaning','delivered','received','packing'];
  payment_statuses text[] := ARRAY['unpaid','unpaid','paid','unpaid','paid','paid','paid','unpaid','unpaid','paid','unpaid','paid'];
BEGIN
  SELECT * INTO existing_tenant FROM public.tenants WHERE slug='${safeSlug}' LIMIT 1;
  IF existing_tenant.id IS NOT NULL THEN
    IF COALESCE(existing_tenant.industry_profile->>'reference_organization','false') <> 'true' THEN
      RAISE EXCEPTION 'Slug % already exists and is not marked as a reference organization. Refusing to overwrite.', '${safeSlug}';
    END IF;
    IF NOT ${reset ? "true" : "false"} THEN
      RAISE EXCEPTION 'Reference organization already exists. Re-run with REFERENCE_RESET=1 to regenerate safely.';
    END IF;
    DELETE FROM public.tenants WHERE id = existing_tenant.id;
  END IF;

  IF owner_id IS NULL THEN
    SELECT user_id INTO owner_id FROM public.user_roles WHERE role='owner' LIMIT 1;
  END IF;
  IF owner_id IS NULL THEN SELECT id INTO owner_id FROM auth.users LIMIT 1; END IF;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'No auth user found to own Dry Tech. Set DRY_TECH_OWNER_USER_ID.'; END IF;

  SELECT id INTO v_template_id FROM public.core_template_registry WHERE slug='laundry' AND status='active' LIMIT 1;
  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Laundry Template is not active. Apply template registry migrations first.';
  END IF;

  SELECT jsonb_build_object(
    'departments', COALESCE((
      SELECT jsonb_agg(a.definition || jsonb_build_object('key', a.asset_key, 'name_ar', a.name_ar, 'name_en', a.name_en, 'enabled', true) ORDER BY a.sort_order)
      FROM public.core_template_assets a WHERE a.template_id=v_template_id AND a.asset_type='department' AND a.is_active
    ), '[]'::jsonb),
    'roles', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('key', a.asset_key, 'name_ar', a.name_ar, 'name_en', a.name_en, 'approval_level', COALESCE((a.definition->>'approval_level')::int,0), 'permissions', COALESCE(a.definition->'permissions','{}'::jsonb)) ORDER BY a.sort_order)
      FROM public.core_template_assets a WHERE a.template_id=v_template_id AND a.asset_type='role' AND a.is_active
    ), '[]'::jsonb),
    'workflows', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('key', a.asset_key, 'name_ar', a.name_ar, 'name_en', a.name_en, 'style', COALESCE(a.definition->>'style','template_defined'), 'definition', a.definition) ORDER BY a.sort_order)
      FROM public.core_template_assets a WHERE a.template_id=v_template_id AND a.asset_type='workflow' AND a.is_active
    ), '[]'::jsonb),
    'financial_events', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('key', a.asset_key, 'name_ar', a.name_ar, 'name_en', a.name_en, 'accounting_rule', a.definition, 'approval_required', COALESCE((a.definition->>'approval_required')::boolean,false)) ORDER BY a.sort_order)
      FROM public.core_template_assets a WHERE a.template_id=v_template_id AND a.asset_type='financial_event' AND a.is_active
    ), '[]'::jsonb)
  ) INTO assets;

  INSERT INTO public.tenants (name, slug, business_type, owner_user_id, is_active, public_url, industry_profile, notes)
  VALUES (
    '${safeName}', '${safeSlug}', 'laundry_template', owner_id, true,
    'https://mjrh.vercel.app/${safeSlug}',
    jsonb_build_object(
      'reference_organization', true,
      'development_environment', false,
      'generated_from_template', 'laundry',
      'generator', 'scripts/generate-reference-dry-tech.mjs',
      'generated_at', now()
    ),
    'Official MJRH reference organization generated from Laundry Template. Not for development or experiments.'
  )
  RETURNING id INTO tid;

  INSERT INTO public.user_roles(user_id, role, tenant_id)
  VALUES (owner_id, 'owner', tid)
  ON CONFLICT DO NOTHING;

  -- Emulate the owner context so the same setup generator path can validate tenant access.
  PERFORM set_config('request.jwt.claim.sub', owner_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  setup := jsonb_build_object(
    'template_slug', 'laundry',
    'organization', jsonb_build_object(
      'name', '${safeName}',
      'industry', 'Laundry Template',
      'business_type', 'Reference Laundry Operations',
      'country', 'EG',
      'currency', 'EGP',
      'languages', jsonb_build_array('ar','en'),
      'timezone', 'Africa/Cairo'
    ),
    'branches', jsonb_build_array(
      jsonb_build_object('name','Dry Tech Main Branch','city','New Cairo','address','Fifth Settlement, New Cairo'),
      jsonb_build_object('name','Dry Tech Pickup Hub','city','New Cairo','address','Mobile pickup and delivery hub')
    ),
    'template_assets', assets,
    'working_hours', jsonb_build_object('days', jsonb_build_array('sat','sun','mon','tue','wed','thu'), 'start','09:00', 'end','22:00'),
    'tax', jsonb_build_object('enabled', true, 'system','standard', 'rate','14'),
    'operational_model', 'multi_branch_laundry_operations',
    'workflow_style', 'template_defined',
    'accounting', jsonb_build_object('basis','cash', 'fiscalYearStart','01-01', 'invoicePrefix','DRY'),
    'notifications', jsonb_build_object('whatsapp', true, 'email', true, 'inApp', true),
    'document_numbering', jsonb_build_object('prefix','DRY', 'nextNumber', 1001),
    'approvals', jsonb_build_array(
      jsonb_build_object('key','discount_approval','label','Discount approval','minAmount','100','levels',1),
      jsonb_build_object('key','cash_settlement','label','Cash settlement approval','minAmount','0','levels',1)
    ),
    'branding', jsonb_build_object('primaryColor','#0f766e','publicUrl','https://mjrh.vercel.app/${safeSlug}')
  );

  PERFORM public.complete_mjrh_core_setup(tid, setup);
  PERFORM public.ensure_default_cash_account_for(tid);
  PERFORM public.ensure_default_chart_accounts_for(tid);

  SELECT id INTO main_branch_id FROM public.branches WHERE tenant_id=tid AND name='Dry Tech Main Branch' LIMIT 1;
  SELECT id INTO hub_branch_id FROM public.branches WHERE tenant_id=tid AND name='Dry Tech Pickup Hub' LIMIT 1;
  IF main_branch_id IS NULL THEN SELECT id INTO main_branch_id FROM public.branches WHERE tenant_id=tid LIMIT 1; END IF;
  IF hub_branch_id IS NULL THEN hub_branch_id := main_branch_id; END IF;

  UPDATE public.employees
  SET full_name='Dry Tech Owner', branch_id=main_branch_id, job_title='Organization Owner', role='owner', job_role='other', is_active=true
  WHERE tenant_id=tid AND profile_id=owner_id;

  INSERT INTO public.employees(tenant_id, branch_id, profile_id, full_name, phone, email, job_title, role, station, job_role, monthly_salary, commission_percent, is_active, current_lat, current_lng, location_updated_at)
  VALUES
    (tid,main_branch_id,NULL,'Nadia Customer Desk','01010000001','nadia.cs@drytech.reference','Customer Coordinator','cs_manager','cs','cs_rep',8500,0,true,NULL,NULL,NULL),
    (tid,main_branch_id,NULL,'Omar Operations Lead','01010000002','omar.ops@drytech.reference','Operations Lead','ops_manager','reception','ops_manager',12000,0,true,NULL,NULL,NULL),
    (tid,main_branch_id,NULL,'Mina Sorting Desk','01010000003','mina.sorting@drytech.reference','Sorting Actor','employee','sorting','sorter',6500,0,true,NULL,NULL,NULL),
    (tid,main_branch_id,NULL,'Hany Cleaning Tech','01010000004','hany.cleaning@drytech.reference','Cleaning Actor','employee','cleaning','cleaning_tech',7500,0,true,NULL,NULL,NULL),
    (tid,main_branch_id,NULL,'Salma Finishing Tech','01010000005','salma.finishing@drytech.reference','Finishing Actor','employee','ironing','ironing_tech',0,30,true,NULL,NULL,NULL),
    (tid,main_branch_id,NULL,'Youssef Quality Control','01010000006','youssef.qc@drytech.reference','Quality Control Actor','employee','qc','qc_tech',7000,0,true,NULL,NULL,NULL),
    (tid,main_branch_id,NULL,'Laila Packing Desk','01010000007','laila.packing@drytech.reference','Packing Actor','employee','packing','packer',6500,0,true,NULL,NULL,NULL),
    (tid,hub_branch_id,NULL,'Tamer Delivery Actor','01010000008','tamer.delivery@drytech.reference','Delivery Actor','courier','delivery','driver',8000,0,true,30.03052,31.40984,now())
  ON CONFLICT (tenant_id,email) DO UPDATE SET is_active=true, branch_id=EXCLUDED.branch_id, full_name=EXCLUDED.full_name;

  SELECT id INTO employee_reception FROM public.employees WHERE tenant_id=tid AND email='nadia.cs@drytech.reference';
  SELECT id INTO employee_ops FROM public.employees WHERE tenant_id=tid AND email='omar.ops@drytech.reference';
  SELECT id INTO employee_sorter FROM public.employees WHERE tenant_id=tid AND email='mina.sorting@drytech.reference';
  SELECT id INTO employee_cleaning FROM public.employees WHERE tenant_id=tid AND email='hany.cleaning@drytech.reference';
  SELECT id INTO employee_ironing FROM public.employees WHERE tenant_id=tid AND email='salma.finishing@drytech.reference';
  SELECT id INTO employee_qc FROM public.employees WHERE tenant_id=tid AND email='youssef.qc@drytech.reference';
  SELECT id INTO employee_packing FROM public.employees WHERE tenant_id=tid AND email='laila.packing@drytech.reference';
  SELECT id INTO employee_driver FROM public.employees WHERE tenant_id=tid AND email='tamer.delivery@drytech.reference';

  -- Remove legacy bootstrap service defaults so the reference catalog proves the Laundry Template assets.
  DELETE FROM public.service_items WHERE tenant_id = tid;

  FOR svc IN
    SELECT asset_key, name_ar, definition
    FROM public.core_template_assets
    WHERE template_id=v_template_id AND asset_type='service' AND is_active
    ORDER BY sort_order
  LOOP
    INSERT INTO public.service_items(tenant_id, name, service_type, unit_price, category, custom_fields, is_active)
    VALUES (
      tid,
      svc.name_ar,
      COALESCE(svc.definition->>'service_type','both')::public.service_type,
      COALESCE((svc.definition->>'unit_price')::numeric,0),
      svc.definition->>'category',
      jsonb_build_object('template_asset_key', svc.asset_key),
      true
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO oid;
  END LOOP;

  SELECT array_agg(id ORDER BY unit_price DESC) INTO svc_ids FROM public.service_items WHERE tenant_id=tid AND is_active;

  FOR c IN SELECT * FROM (VALUES
    ('Ahmed Heshmat','01020000001','ahmed.heshmat@example.com','Mivida New Cairo',30.00094,31.54348,'VIP - prefers morning pickup'),
    ('Mona Adel','01020000002','mona.adel@example.com','Madinaty Gate 2',30.09333,31.63855,'Family weekly laundry'),
    ('Karim Nabil','01020000003','karim.nabil@example.com','Rehab City Gate 13',30.06295,31.48818,'Business suits'),
    ('Salma Yasser','01020000004','salma.yasser@example.com','Cairo Festival City',30.03052,31.40984,'Express orders'),
    ('Hussein Farid','01020000005','hussein.farid@example.com','South Teseen',30.01962,31.49346,'Carpet cleaning'),
    ('Nour Khaled','01020000006','nour.khaled@example.com','District 5',29.98669,31.44512,'Curtains and linens'),
    ('Farida Samir','01020000007','farida.samir@example.com','Mountain View iCity',30.02221,31.55651,'Delicate items'),
    ('Yara Mostafa','01020000008','yara.mostafa@example.com','Palm Hills New Cairo',30.06080,31.52025,'InstaPay customer')
  ) AS x(full_name, phone, email, address, lat, lng, notes)
  LOOP
    INSERT INTO public.customers(tenant_id, full_name, phone, email, address, lat, lng, location_url, notes)
    VALUES (tid,c.full_name,c.phone,c.email,c.address,c.lat,c.lng,'https://www.google.com/maps?q='||c.lat||','||c.lng,c.notes)
    RETURNING id INTO oid;
    customer_ids := array_append(customer_ids, oid);
  END LOOP;

  FOR idx IN 1..12 LOOP
    INSERT INTO public.orders(
      customer_id, tenant_id, branch_id, order_type, status, payment_status, payment_method,
      pickup_address, delivery_address, pickup_lat, pickup_lng, delivery_lat, delivery_lng,
      subtotal, total, notes, assigned_driver_employee_id, invoice_finalized_at, promised_delivery_at, delivered_at, created_at
    )
    SELECT
      customer_ids[((idx - 1) % array_length(customer_ids,1)) + 1], tid,
      CASE WHEN idx % 4 = 0 THEN hub_branch_id ELSE main_branch_id END,
      CASE WHEN idx % 3 = 0 THEN 'walk_in'::public.order_type ELSE 'delivery'::public.order_type END,
      statuses[idx]::public.order_status,
      payment_statuses[idx]::public.payment_status,
      CASE WHEN payment_statuses[idx]='paid' THEN CASE WHEN idx % 2 = 0 THEN 'instapay'::public.payment_method ELSE 'cash'::public.payment_method END ELSE NULL END,
      'New Cairo Reference Area', 'New Cairo Reference Area', 30.03052,31.40984,30.03052,31.40984,
      0, 0,
      'Dry Tech generated reference order #'||idx,
      CASE WHEN statuses[idx] IN ('out_for_delivery','delivered') THEN employee_driver ELSE NULL END,
      CASE WHEN statuses[idx] IN ('ready','out_for_delivery','delivered') THEN now() - (idx || ' hours')::interval ELSE NULL END,
      now() + ((24 + idx) || ' hours')::interval,
      CASE WHEN statuses[idx]='delivered' THEN now() - (idx || ' hours')::interval ELSE NULL END,
      now() - ((idx * 5) || ' hours')::interval
    RETURNING id INTO oid;

    unit_no := 1;
    FOR svc IN
      SELECT * FROM public.service_items
      WHERE tenant_id=tid AND id = ANY(svc_ids)
      ORDER BY unit_price DESC
      OFFSET ((idx - 1) % 4)
      LIMIT 3
    LOOP
      INSERT INTO public.order_items(order_id, tenant_id, service_item_id, name, service_type, qty, unit_price)
      VALUES (oid, tid, svc.id, svc.name, svc.service_type, 1, svc.unit_price)
      RETURNING id INTO oi;

      INSERT INTO public.service_units(order_id, order_item_id, unit_number, name, garment_type, service_type, unit_price, line_value, status, current_stage, tenant_id, assigned_ironing_employee_id, ironing_completed_at)
      VALUES (
        oid, oi, unit_no, svc.name, svc.name, svc.service_type, svc.unit_price, svc.unit_price,
        CASE WHEN statuses[idx]='delivered' THEN 'delivered' ELSE statuses[idx] END,
        CASE WHEN statuses[idx] IN ('cleaning','ironing','packing','ready','out_for_delivery','delivered') THEN statuses[idx] ELSE 'received' END,
        tid,
        CASE WHEN statuses[idx] IN ('ironing','packing','ready','out_for_delivery','delivered') THEN employee_ironing ELSE NULL END,
        CASE WHEN statuses[idx] IN ('packing','ready','out_for_delivery','delivered') THEN now() - (idx || ' hours')::interval ELSE NULL END
      );
      unit_no := unit_no + 1;
    END LOOP;

    UPDATE public.orders o
    SET subtotal = x.total, total = x.total
    FROM (SELECT COALESCE(sum(line_total),0) AS total FROM public.order_items WHERE order_id=oid) x
    WHERE o.id=oid;

    IF payment_statuses[idx]='paid' THEN
      BEGIN
        PERFORM public.sync_order_financials(oid);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;

  INSERT INTO public.pickup_requests(tenant_id, branch_id, customer_id, customer_name, phone, address, lat, lng, estimated_pieces, status, notes)
  SELECT tid, hub_branch_id, customer_ids[1], 'Ahmed Heshmat', '01020000001', 'Mivida New Cairo', 30.00094,31.54348, 5, 'pending'::public.pickup_status, 'Reference pending pickup'
  UNION ALL
  SELECT tid, hub_branch_id, customer_ids[2], 'Mona Adel', '01020000002', 'Madinaty Gate 2', 30.09333,31.63855, 8, 'assigned'::public.pickup_status, 'Reference assigned pickup';

  INSERT INTO public.core_documents(tenant_id, document_key, name_ar, name_en, numbering, schema)
  VALUES
    (tid,'intake_receipt','إيصال استلام','Intake Receipt',jsonb_build_object('prefix','DRY-IN'),jsonb_build_object('source','laundry_template')),
    (tid,'delivery_note','إذن تسليم','Delivery Note',jsonb_build_object('prefix','DRY-DN'),jsonb_build_object('source','laundry_template')),
    (tid,'payment_receipt','إيصال دفع','Payment Receipt',jsonb_build_object('prefix','DRY-PAY'),jsonb_build_object('source','laundry_template'))
  ON CONFLICT (tenant_id, document_key) DO UPDATE SET numbering=EXCLUDED.numbering, schema=EXCLUDED.schema, is_active=true;

  INSERT INTO public.core_forms(tenant_id, form_key, name_ar, name_en, schema)
  VALUES
    (tid,'intake_checklist','قائمة فحص الاستلام','Intake Checklist',jsonb_build_object('fields',jsonb_build_array('item_type','color','brand','defects','customer_notes'))),
    (tid,'quality_check','فحص الجودة','Quality Check',jsonb_build_object('fields',jsonb_build_array('cleanliness','pressing_quality','packaging','exception_notes')))
  ON CONFLICT (tenant_id, form_key) DO UPDATE SET schema=EXCLUDED.schema, is_active=true;

  PERFORM public.record_operation_event(
    'reference_organization_generated',
    'Dry Tech generated from Laundry Template',
    'tenant', tid, main_branch_id, NULL, NULL,
    'platform-generator/reference', false, NULL,
    jsonb_build_object('tenant_id',tid,'slug','${safeSlug}','template','laundry'),
    jsonb_build_object('cash_impact',false,'journal_required',false,'appears_in_report',true)
  );
END $$;

SELECT
  t.id,
  t.name,
  t.slug,
  t.business_type,
  t.industry_profile->>'generated_from_template' AS generated_from_template,
  (SELECT count(*) FROM public.branches WHERE tenant_id=t.id) AS branches_count,
  (SELECT count(*) FROM public.core_departments WHERE tenant_id=t.id) AS departments_count,
  (SELECT count(*) FROM public.core_roles WHERE tenant_id=t.id) AS core_roles_count,
  (SELECT count(*) FROM public.employees WHERE tenant_id=t.id) AS employees_count,
  (SELECT count(*) FROM public.customers WHERE tenant_id=t.id) AS customers_count,
  (SELECT count(*) FROM public.service_items WHERE tenant_id=t.id) AS services_count,
  (SELECT count(*) FROM public.core_workflow_blueprints WHERE tenant_id=t.id) AS workflows_count,
  (SELECT count(*) FROM public.core_financial_event_types WHERE tenant_id=t.id) AS financial_event_types_count,
  (SELECT count(*) FROM public.orders WHERE tenant_id=t.id) AS orders_count,
  (SELECT count(*) FROM public.pickup_requests WHERE tenant_id=t.id) AS pickup_requests_count,
  (SELECT public.can_enter_platform(t.id)) AS can_enter_platform
FROM public.tenants t
WHERE t.slug='${safeSlug}';
${maybeRollback}
`;

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
if (!res.ok) {
  console.error(text);
  process.exit(1);
}

let parsed;
try { parsed = JSON.parse(text); } catch { parsed = text; }
if (parsed?.message) {
  console.error(parsed.message);
  process.exit(1);
}

console.log(apply ? "Dry Tech reference organization generated:" : "Dry Tech reference dry-run passed:");
console.log(JSON.stringify(parsed, null, 2));
