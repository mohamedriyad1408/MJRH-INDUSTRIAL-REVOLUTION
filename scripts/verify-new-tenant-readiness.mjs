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
  h record;
  catalog_count int;
  chart_count int;
  feature_count int;
  cash_with_branch int;
BEGIN
  SELECT user_id INTO owner_id FROM public.user_roles WHERE role='owner' LIMIT 1;
  IF owner_id IS NULL THEN SELECT id INTO owner_id FROM auth.users LIMIT 1; END IF;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'No auth user to simulate owner'; END IF;

  INSERT INTO public.tenants(name, slug, business_type, owner_user_id)
  VALUES ('CI Tenant Readiness', '${slug}', 'laundry', owner_id)
  RETURNING id INTO tid;

  PERFORM public.seed_tenant_defaults(tid, 'CI Tenant Readiness');
  PERFORM public.ensure_tenant_owner_employee(tid);

  SELECT * INTO h FROM public.tenant_bootstrap_health WHERE tenant_id=tid;
  SELECT count(*) INTO catalog_count FROM public.service_items WHERE tenant_id=tid AND is_active;
  SELECT count(*) INTO chart_count FROM public.chart_accounts WHERE tenant_id=tid AND is_active;
  SELECT count(*) INTO feature_count FROM public.tenant_features WHERE tenant_id=tid AND enabled;
  SELECT count(*) INTO cash_with_branch FROM public.cash_accounts WHERE tenant_id=tid AND is_active AND branch_id IS NOT NULL;

  IF h.is_ready IS NOT TRUE THEN
    RAISE EXCEPTION 'Tenant not ready: settings %, branch %, cash %, chart %, employee %, catalog %', h.has_settings, h.has_branch, h.has_cash_account, h.has_chart_accounts, h.has_employee, h.has_catalog;
  END IF;
  IF catalog_count < 10 THEN RAISE EXCEPTION 'Catalog too small: %', catalog_count; END IF;
  IF chart_count < 10 THEN RAISE EXCEPTION 'Chart too small: %', chart_count; END IF;
  IF feature_count < 8 THEN RAISE EXCEPTION 'Features too few: %', feature_count; END IF;
  IF cash_with_branch < 1 THEN RAISE EXCEPTION 'No active branch-linked cash account'; END IF;
  IF h.has_customer_returns_feature IS NOT TRUE THEN RAISE EXCEPTION 'customer_returns feature missing'; END IF;
  IF h.has_ironing_distribution_feature IS NOT TRUE THEN RAISE EXCEPTION 'ironing_distribution feature missing'; END IF;
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
