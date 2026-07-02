import fs from "node:fs";

function readEnvFile(path) {
  try {
    return Object.fromEntries(
      fs.readFileSync(path, "utf8")
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const idx = line.indexOf("=");
          return [line.slice(0, idx), line.slice(idx + 1)];
        })
    );
  } catch {
    return {};
  }
}

const fileEnv = readEnvFile(".env.production");
const supabaseUrl = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || "https://dngjfjrjddigqadlyain.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY || fileEnv.VITE_SUPABASE_ANON_KEY || "sb_publishable_JRp6rlQy0si3ZEA4WAHIYw_3dlJ4hfY";
const email = process.env.E2E_AUTH_EMAIL;
const password = process.env.E2E_AUTH_PASSWORD;
const appUrl = process.env.PLAYWRIGHT_BASE_URL || "https://mjrh.vercel.app";

const failures = [];
const warnings = [];

function logCheck(name, status, detail = "") {
  const icon = status === "ok" ? "✅" : status === "warn" ? "⚠️" : "❌";
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function checkFrontend() {
  const res = await fetch(appUrl, { redirect: "follow" });
  if (!res.ok) {
    failures.push(`Frontend returned HTTP ${res.status}`);
    logCheck("Frontend HTTP", "fail", String(res.status));
    return;
  }
  const html = await res.text();
  const asset = html.match(/\/assets\/index-[^"']+\.js/)?.[0];
  logCheck("Frontend HTTP", "ok", `${res.status}`);
  if (!asset) {
    warnings.push("Could not find main JS asset in HTML.");
    logCheck("Main JS asset", "warn", "not found");
    return;
  }
  const jsRes = await fetch(`${appUrl}${asset}`);
  const js = await jsRes.text();
  const hasLanguageV2 = js.includes("mjrh.language.v2");
  if (!hasLanguageV2) failures.push("Live bundle does not include mjrh.language.v2; language fallback fix may not be deployed.");
  logCheck("Language bundle marker", hasLanguageV2 ? "ok" : "fail", asset);
}

async function signIn() {
  if (!supabaseUrl || !supabaseKey) {
    warnings.push("Missing VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY; DB health checks skipped.");
    return null;
  }
  if (!email || !password) {
    warnings.push("Missing E2E_AUTH_EMAIL/E2E_AUTH_PASSWORD; authenticated DB health checks skipped.");
    return null;
  }
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: supabaseKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    failures.push(`Production auth failed: ${await res.text()}`);
    return null;
  }
  const data = await res.json();
  logCheck("Production owner auth", "ok");
  return data.access_token;
}

async function rest(token, name, path, { failWhenPositive = false, warnWhenPositive = false, action = "" } = {}) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${token}`, Prefer: "count=exact" },
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  const count = Number(res.headers.get("content-range")?.split("/")?.[1] ?? (Array.isArray(data) ? data.length : 0));
  if (!res.ok) {
    failures.push(`${name} query failed: ${typeof data === "string" ? data : JSON.stringify(data)}`);
    logCheck(name, "fail", `HTTP ${res.status}`);
    return { count: null, data: [] };
  }
  if (failWhenPositive && count > 0) {
    failures.push(`${name}: ${count} item(s). ${action}`.trim());
    logCheck(name, "fail", `${count} item(s)`);
  } else if (warnWhenPositive && count > 0) {
    warnings.push(`${name}: ${count} item(s). ${action}`.trim());
    logCheck(name, "warn", `${count} item(s)`);
  } else {
    logCheck(name, "ok", `${count} item(s)`);
  }
  if (Array.isArray(data) && data.length) {
    console.log(JSON.stringify(data.slice(0, 5), null, 2));
  }
  return { count, data };
}

await checkFrontend();
const token = await signIn();
if (token) {
  await rest(token, "Unresolved client errors", "client_error_logs?select=id,message,path,created_at&resolved_at=is.null&limit=5&order=created_at.desc", { failWhenPositive: true, action: "Open /system-health and resolve or inspect stack traces." });
  await rest(token, "Financial audit issues", "financial_operation_audit?select=issue_key,severity,title,detail&limit=5&order=created_at.desc", { failWhenPositive: true, action: "Open /system-health or /accounting and run financial repair." });
  await rest(token, "Queued WhatsApp messages", "customer_messages?select=id,channel,status,created_at,orders(order_number)&channel=eq.whatsapp&status=eq.queued&limit=5&order=created_at.desc", { warnWhenPositive: true, action: "Open /system-health, click Open WhatsApp, send manually, then mark as sent." });
}

if (warnings.length) {
  console.log("\nWarnings:");
  for (const w of warnings) console.log(`- ${w}`);
}
if (failures.length) {
  console.error("\nProduction health failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("\nProduction health check passed.");
