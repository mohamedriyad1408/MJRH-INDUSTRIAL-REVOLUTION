import fs from "node:fs";
import crypto from "node:crypto";

function readProjectRef() {
  const envRef = process.env.SUPABASE_PROJECT_REF;
  if (envRef) return envRef;
  try {
    const toml = fs.readFileSync("supabase/config.toml", "utf8");
    const m = toml.match(/project_id\s*=\s*"([^"]+)"/);
    if (m) return m[1];
  } catch {}
  return null;
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = readProjectRef();

if (!token || !ref) {
  console.log("Skipping new tenant readiness verification: SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF is missing.");
  process.exit(0);
}

const slug = `ci-readiness-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
const sql = `
BEGIN;
DO $$
DECLARE
  tid uuid;
  owner_id uuid;
  v_branch_id uuid;
  v_service_id uuid;
  v_customer_id uuid;
  v_order_id uuid;
  v_item_id uuid;
  h record;
  catalog_count int;
  chart_count int;
  feature_count int;
  cash_with_branch int;
  catalog_both int;
  catalog_ironing int;
  catalog_cleaning int;
  owner_employee_ready int;
  order_unit_count int;
  missing_features text[];
  missing_functions text[];
BEGIN
  SELECT user_id INTO owner_id FROM public.user_roles WHERE role='owner' LIMIT 1;
  IF owner_id IS NULL THEN SELECT id INTO owner_id FROM auth.users LIMIT 1; END IF;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'No auth user to simulate owner'; END IF;

  INSERT INTO public.tenants(name, slug, business_type, owner_user_id)
  VALUES ('CI Tenant Readiness', '${slug}', 'laundry', owner_id)
  RETURNING id INTO tid;

  INSERT INTO public.user_roles(user_id, role, tenant_id)
  VALUES (owner_id, 'owner', tid)
  ON CONFLICT DO NOTHING;

  PERFORM public.seed_tenant_defaults(tid, 'CI Tenant Readiness');
  PERFORM public.ensure_tenant_owner_employee(tid);

  SELECT * INTO h FROM public.tenant_bootstrap_health WHERE tenant_id=tid;
  SELECT public.default_branch_id_for(tid) INTO v_branch_id;
  SELECT count(*) INTO catalog_count FROM public.service_items WHERE tenant_id=tid AND is_active;
  SELECT count(*) INTO chart_count FROM public.chart_accounts WHERE tenant_id=tid AND is_active;
  SELECT count(*) INTO feature_count FROM public.tenant_features WHERE tenant_id=tid AND enabled;
  SELECT count(*) INTO cash_with_branch FROM public.cash_accounts WHERE tenant_id=tid AND is_active AND public.cash_accounts.branch_id IS NOT NULL;
  UPDATE public.employees SET branch_id = COALESCE(branch_id, v_branch_id) WHERE tenant_id=tid AND profile_id=owner_id;

  SELECT count(*) INTO catalog_both FROM public.service_items WHERE tenant_id=tid AND is_active AND service_type='both';
  SELECT count(*) INTO catalog_ironing FROM public.service_items WHERE tenant_id=tid AND is_active AND service_type='ironing';
  SELECT count(*) INTO catalog_cleaning FROM public.service_items WHERE tenant_id=tid AND is_active AND service_type='cleaning';
  SELECT count(*) INTO owner_employee_ready FROM public.employees WHERE tenant_id=tid AND profile_id=owner_id AND public.employees.branch_id IS NOT NULL AND is_active;

  SELECT array_agg(feature_key ORDER BY feature_key) INTO missing_features
  FROM (VALUES
    ('orders'), ('customer_portal'), ('driver_map'), ('inventory'), ('accounting'), ('cash_closing'), ('apdo'), ('customer_returns'), ('ironing_distribution'), ('payment_proofs')
  ) AS required(feature_key)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_features tf WHERE tf.tenant_id=tid AND tf.feature_key=required.feature_key AND tf.enabled
  );

  SELECT array_agg(fn ORDER BY fn) INTO missing_functions
  FROM (VALUES
    ('seed_tenant_defaults'), ('ensure_default_cash_account_for'), ('ensure_default_chart_accounts_for'), ('ensure_default_branch_for'),
    ('record_operation_event'), ('register_customer_return'), ('complete_customer_return'), ('repair_financial_operation_audit'), ('repair_operation_events_apdo')
  ) AS required(fn)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=required.fn
  );

  IF h.is_ready IS NOT TRUE THEN
    RAISE EXCEPTION 'Tenant not ready: settings %, branch %, cash %, chart %, employee %, catalog %', h.has_settings, h.has_branch, h.has_cash_account, h.has_chart_accounts, h.has_employee, h.has_catalog;
  END IF;
  IF v_branch_id IS NULL THEN RAISE EXCEPTION 'No default branch returned'; END IF;
  IF catalog_count < 10 THEN RAISE EXCEPTION 'Catalog too small: %', catalog_count; END IF;
  IF catalog_both < 5 OR catalog_ironing < 5 OR catalog_cleaning < 3 THEN RAISE EXCEPTION 'Catalog service-type mix incomplete: both %, ironing %, cleaning %', catalog_both, catalog_ironing, catalog_cleaning; END IF;
  IF chart_count < 10 THEN RAISE EXCEPTION 'Chart too small: %', chart_count; END IF;
  IF feature_count < 10 OR COALESCE(array_length(missing_features, 1), 0) > 0 THEN RAISE EXCEPTION 'Missing tenant features: %', missing_features; END IF;
  IF COALESCE(array_length(missing_functions, 1), 0) > 0 THEN RAISE EXCEPTION 'Missing production functions: %', missing_functions; END IF;
  IF cash_with_branch < 1 THEN RAISE EXCEPTION 'No active branch-linked cash account'; END IF;
  IF owner_employee_ready < 1 THEN RAISE EXCEPTION 'Owner employee is not active/branch-linked'; END IF;
  IF h.has_customer_returns_feature IS NOT TRUE THEN RAISE EXCEPTION 'customer_returns feature missing'; END IF;
  IF h.has_ironing_distribution_feature IS NOT TRUE THEN RAISE EXCEPTION 'ironing_distribution feature missing'; END IF;

  SELECT id INTO v_service_id FROM public.service_items WHERE tenant_id=tid AND is_active AND service_type IN ('both','ironing') ORDER BY service_type='both' DESC, created_at LIMIT 1;
  IF v_service_id IS NULL THEN RAISE EXCEPTION 'No service item available for order smoke'; END IF;

  INSERT INTO public.customers(tenant_id, full_name, phone, address)
  VALUES (tid, 'CI Smoke Customer', '01000000000', 'CI Address')
  RETURNING id INTO v_customer_id;

  INSERT INTO public.orders(tenant_id, customer_id, branch_id, order_type, status, payment_method, payment_status, subtotal, total, created_by, notes)
  VALUES (tid, v_customer_id, v_branch_id, 'walk_in', 'received', 'cash', 'unpaid', 45, 45, owner_id, 'CI first real laundry smoke order')
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items(tenant_id, order_id, service_item_id, name, service_type, qty, unit_price)
  SELECT tid, v_order_id, id, name, service_type, 1, unit_price FROM public.service_items WHERE id=v_service_id
  RETURNING id INTO v_item_id;

  INSERT INTO public.service_units(tenant_id, order_id, order_item_id, unit_number, name, garment_type, service_type, unit_price, line_value, complexity_factor, is_shirt_like, status, current_stage)
  SELECT tid, v_order_id, v_item_id, 1, name, name, service_type, unit_price, unit_price, 2, true, 'received', 'received' FROM public.service_items WHERE id=v_service_id;

  PERFORM public.record_operation_event('ci_first_laundry_order_smoke', 'أمر اختبار جاهزية أول مغسلة حقيقية', 'order', v_order_id, v_branch_id, null, null, 'ci/readiness', false, null, jsonb_build_object('tenant_id', tid, 'order_id', v_order_id), jsonb_build_object('cash_impact', false, 'journal_required', false, 'appears_in_report', true));

  SELECT count(*) INTO order_unit_count FROM public.service_units WHERE tenant_id=tid AND order_id=v_order_id AND current_stage='received';
  IF order_unit_count <> 1 THEN RAISE EXCEPTION 'Order smoke failed: expected 1 received unit, got %', order_unit_count; END IF;
END $$;
ROLLBACK;
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

console.log(`New tenant readiness verification passed via rollback tenant slug: ${slug}`);
