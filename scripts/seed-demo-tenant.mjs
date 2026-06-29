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
const apply = process.env.DEMO_APPLY === "1" || process.argv.includes("--apply");
const slug = process.env.DEMO_TENANT_SLUG || "mjrh-demo";
const name = process.env.DEMO_TENANT_NAME || "MJRH Demo Laundry";
const ownerUserId = process.env.DEMO_OWNER_USER_ID || null;

if (!token || !ref) {
  console.log("Skipping demo tenant seed: SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF is missing.");
  process.exit(0);
}

const maybeBegin = apply ? "" : "BEGIN;";
const maybeRollback = apply ? "" : "ROLLBACK;";
const ownerExpr = ownerUserId ? `'${ownerUserId}'::uuid` : "NULL::uuid";

const sql = `
${maybeBegin}
DO $$
DECLARE
  owner_id uuid := ${ownerExpr};
  tid uuid;
  bid uuid;
  cash_id uuid;
  driver_id uuid;
  cleaning_id uuid;
  ironing1_id uuid;
  ironing2_id uuid;
  packing_id uuid;
  reception_id uuid;
  c1 uuid; c2 uuid; c3 uuid; c4 uuid;
  svc record;
  oid uuid;
  oi uuid;
  unit_no int;
  pub uuid;
  proof_url text := 'https://dngjfjrjddigqadlyain.supabase.co/storage/v1/object/public/payment-proofs/customer-payments/real-ahmed-heshmat-1782655844.jpg';
BEGIN
  IF owner_id IS NULL THEN
    SELECT user_id INTO owner_id FROM public.user_roles WHERE role='owner' LIMIT 1;
  END IF;
  IF owner_id IS NULL THEN SELECT id INTO owner_id FROM auth.users LIMIT 1; END IF;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'No auth user found to own demo tenant. Set DEMO_OWNER_USER_ID.'; END IF;

  -- Reset demo tenant only.
  DELETE FROM public.tenants WHERE slug='${slug}';

  INSERT INTO public.tenants(name, slug, business_type, owner_user_id, notes, public_url, industry_profile)
  VALUES ('${name}', '${slug}', 'laundry', owner_id, 'MJRH generated demo tenant', 'https://mjrh.vercel.app/${slug}', jsonb_build_object('demo', true, 'source', 'seed-demo-tenant'))
  RETURNING id INTO tid;

  INSERT INTO public.user_roles(user_id, role, tenant_id)
  VALUES (owner_id, 'owner', tid)
  ON CONFLICT DO NOTHING;

  PERFORM public.seed_tenant_defaults(tid, '${name}');
  PERFORM public.ensure_tenant_owner_employee(tid);
  bid := public.default_branch_id_for(tid);
  cash_id := public.ensure_default_cash_account_for(tid);

  INSERT INTO public.employees(tenant_id, branch_id, full_name, email, job_title, role, station, job_role, monthly_salary, commission_percent, is_active, current_lat, current_lng, location_updated_at)
  VALUES
    (tid,bid,'Demo Reception','demo.reception@mjrh.local','استقبال','employee','reception','receptionist',6000,0,true,NULL,NULL,NULL),
    (tid,bid,'Demo Cleaner','demo.cleaner@mjrh.local','فني تنظيف','employee','cleaning','cleaning_tech',7500,0,true,NULL,NULL,NULL),
    (tid,bid,'Demo Ironing A','demo.iron.a@mjrh.local','فني كي','employee','ironing','ironing_tech',0,30,true,NULL,NULL,NULL),
    (tid,bid,'Demo Ironing B','demo.iron.b@mjrh.local','فني كي','employee','ironing','ironing_tech',0,30,true,NULL,NULL,NULL),
    (tid,bid,'Demo Packing','demo.packing@mjrh.local','تغليف','employee','packing','packing_tech',6500,0,true,NULL,NULL,NULL),
    (tid,bid,'Demo Driver','demo.driver@mjrh.local','مندوب','courier','delivery','driver',7500,0,true,30.0444,31.2357,now())
  ON CONFLICT (tenant_id,email) DO UPDATE SET
    branch_id=EXCLUDED.branch_id,
    full_name=EXCLUDED.full_name,
    role=EXCLUDED.role,
    station=EXCLUDED.station,
    job_role=EXCLUDED.job_role,
    is_active=true,
    current_lat=EXCLUDED.current_lat,
    current_lng=EXCLUDED.current_lng,
    location_updated_at=EXCLUDED.location_updated_at;

  SELECT id INTO driver_id FROM public.employees WHERE tenant_id=tid AND email='demo.driver@mjrh.local';
  SELECT id INTO cleaning_id FROM public.employees WHERE tenant_id=tid AND email='demo.cleaner@mjrh.local';
  SELECT id INTO ironing1_id FROM public.employees WHERE tenant_id=tid AND email='demo.iron.a@mjrh.local';
  SELECT id INTO ironing2_id FROM public.employees WHERE tenant_id=tid AND email='demo.iron.b@mjrh.local';
  SELECT id INTO packing_id FROM public.employees WHERE tenant_id=tid AND email='demo.packing@mjrh.local';
  SELECT id INTO reception_id FROM public.employees WHERE tenant_id=tid AND email='demo.reception@mjrh.local';

  INSERT INTO public.customers(tenant_id, full_name, phone, email, address, lat, lng, location_url, notes)
  VALUES
    (tid,'Demo Ahmed','01090000001','demo.ahmed@example.com','Mivida New Cairo',30.00094,31.54348,'https://www.google.com/maps?q=30.00094,31.54348','Demo customer'),
    (tid,'Demo Mona','01090000002','demo.mona@example.com','Madinaty Gate 2',30.09333,31.63855,'https://www.google.com/maps?q=30.09333,31.63855','Demo customer'),
    (tid,'Demo Karim','01090000003','demo.karim@example.com','Rehab City Gate 13',30.06295,31.48818,'https://www.google.com/maps?q=30.06295,31.48818','Demo customer'),
    (tid,'Demo Salma','01090000004','demo.salma@example.com','Cairo Festival City',30.03052,31.40984,'https://www.google.com/maps?q=30.03052,31.40984','Demo customer');
  SELECT id INTO c1 FROM public.customers WHERE tenant_id=tid AND phone='01090000001';
  SELECT id INTO c2 FROM public.customers WHERE tenant_id=tid AND phone='01090000002';
  SELECT id INTO c3 FROM public.customers WHERE tenant_id=tid AND phone='01090000003';
  SELECT id INTO c4 FROM public.customers WHERE tenant_id=tid AND phone='01090000004';

  -- Helper via repeated creation: order 1 delivered with instapay tip.
  INSERT INTO public.orders(customer_id, tenant_id, branch_id, order_type, status, payment_status, payment_method, pickup_address, delivery_address, pickup_lat, pickup_lng, delivery_lat, delivery_lng, subtotal, total, notes, assigned_driver_employee_id, promised_delivery_at)
  VALUES (c1, tid, bid, 'delivery', 'ready', 'unpaid', 'instapay', 'Mivida New Cairo', 'Mivida New Cairo', 30.00094,31.54348,30.00094,31.54348, 1015,1015,'Demo: delivered InstaPay overpayment', driver_id, now()+interval '1 day')
  RETURNING id, public_token INTO oid, pub;

  unit_no := 1;
  FOR svc IN SELECT * FROM public.service_items WHERE tenant_id=tid AND is_active ORDER BY unit_price DESC LIMIT 6 LOOP
    INSERT INTO public.order_items(order_id, tenant_id, service_item_id, name, service_type, qty, unit_price)
    VALUES (oid, tid, svc.id, svc.name, svc.service_type, 1, svc.unit_price) RETURNING id INTO oi;
    INSERT INTO public.service_units(order_id, order_item_id, unit_number, name, garment_type, service_type, unit_price, line_value, status, current_stage, tenant_id, assigned_ironing_employee_id, ironing_completed_at)
    VALUES (oid, oi, unit_no, svc.name, svc.name, svc.service_type, svc.unit_price, svc.unit_price, 'delivered','delivered',tid, CASE WHEN unit_no % 2 = 0 THEN ironing1_id ELSE ironing2_id END, now());
    unit_no := unit_no + 1;
  END LOOP;
  UPDATE public.orders SET invoice_finalized_at=now(), payment_proof_url=proof_url, payment_proof_uploaded_at=now(), payment_status='paid', customer_payment_amount=1085, payment_detected_amount=1085, payment_verification_status='overpaid', overpayment_amount=70, tip_employee_id=driver_id, status='delivered', delivered_at=now() WHERE id=oid;
  PERFORM public.sync_order_financials(oid);
  INSERT INTO public.customer_messages(tenant_id, customer_id, order_id, channel, template_key, phone, message, status)
  VALUES (tid,c1,oid,'whatsapp','demo_tracking','01090000001','Demo tracking: https://mjrh.vercel.app/track/'||pub::text,'queued');

  -- order 2 pending pickup for map.
  INSERT INTO public.orders(customer_id, tenant_id, branch_id, order_type, status, payment_status, pickup_address, delivery_address, pickup_lat, pickup_lng, delivery_lat, delivery_lng, subtotal, total, notes, promised_delivery_at)
  VALUES (c2, tid, bid, 'delivery','received','unpaid','Madinaty Gate 2','Madinaty Gate 2',30.09333,31.63855,30.09333,31.63855,160,160,'Demo: pending pickup', now()+interval '1 day')
  RETURNING id INTO oid;
  INSERT INTO public.pickup_requests(tenant_id, branch_id, customer_id, customer_name, phone, address, lat, lng, estimated_pieces, status, converted_order_id, notes)
  VALUES (tid,bid,c2,'Demo Mona','01090000002','Madinaty Gate 2',30.09333,31.63855,3,'pending',oid,'Demo pickup on map');

  -- order 3 ready unpaid for map.
  INSERT INTO public.orders(customer_id, tenant_id, branch_id, order_type, status, payment_status, pickup_address, delivery_address, pickup_lat, pickup_lng, delivery_lat, delivery_lng, subtotal, total, notes, invoice_finalized_at, promised_delivery_at)
  VALUES (c3, tid, bid, 'delivery','ready','unpaid','Rehab City Gate 13','Rehab City Gate 13',30.06295,31.48818,30.06295,31.48818,410,410,'Demo: ready unpaid', now(), now()+interval '1 day')
  RETURNING id INTO oid;

  -- order 4 out for delivery paid.
  INSERT INTO public.orders(customer_id, tenant_id, branch_id, order_type, status, payment_status, payment_method, pickup_address, delivery_address, pickup_lat, pickup_lng, delivery_lat, delivery_lng, subtotal, total, notes, invoice_finalized_at, assigned_driver_employee_id, promised_delivery_at)
  VALUES (c4, tid, bid, 'delivery','out_for_delivery','paid','cod_cash','Cairo Festival City','Cairo Festival City',30.03052,31.40984,30.03052,31.40984,530,530,'Demo: out for delivery', now(), driver_id, now()+interval '1 day')
  RETURNING id INTO oid;
  PERFORM public.sync_order_financials(oid);

  PERFORM public.record_operation_event('demo_tenant_seeded','تجهيز بيانات Demo Tenant','tenant',tid,bid,NULL,NULL,'admin/demo',false,NULL,jsonb_build_object('tenant_id',tid,'slug','${slug}'),jsonb_build_object('cash_impact',false,'journal_required',false,'appears_in_report',true));
END $$;

SELECT t.id,t.name,t.slug,h.is_ready,
  (select count(*) from public.orders o where o.tenant_id=t.id) as orders_count,
  (select count(*) from public.customers c where c.tenant_id=t.id) as customers_count,
  (select count(*) from public.employees e where e.tenant_id=t.id) as employees_count,
  (select count(*) from public.service_items s where s.tenant_id=t.id) as services_count
FROM public.tenants t
LEFT JOIN public.tenant_bootstrap_health h ON h.tenant_id=t.id
WHERE t.slug='${slug}';
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
console.log(apply ? "Demo tenant seeded:" : "Demo tenant dry-run passed:");
console.log(JSON.stringify(parsed, null, 2));
