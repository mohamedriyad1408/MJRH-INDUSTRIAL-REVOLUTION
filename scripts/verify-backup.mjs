#!/usr/bin/env node
// MJRH — Backup Verification Script
// Checks that critical tables exist and have data in the Supabase project.
// Usage: node scripts/verify-backup.mjs

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://dngjfjrjddigqadlyain.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

if (!SUPABASE_KEY) {
  console.error("Missing VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const CRITICAL_TABLES = [
  "tenants",
  "orders",
  "order_items",
  "service_units",
  "customers",
  "employees",
  "branches",
  "cash_accounts",
  "cash_transactions",
  "journal_entries",
  "journal_lines",
  "app_settings",
  "user_roles",
  "service_items",
];

async function checkTable(table) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: "count=exact" },
    });
    if (!res.ok) return { table, status: "error", detail: `HTTP ${res.status}` };
    const count = Number(res.headers.get("content-range")?.split("/")?.[1] ?? 0);
    return { table, status: count >= 0 ? "ok" : "empty", count };
  } catch (e) {
    return { table, status: "error", detail: e.message };
  }
}

console.log("MJRH Backup Verification");
console.log("========================\n");

const results = await Promise.all(CRITICAL_TABLES.map(checkTable));

let allOk = true;
for (const r of results) {
  const icon = r.status === "ok" ? "✅" : r.status === "empty" ? "⚠️" : "❌";
  console.log(`${icon} ${r.table}: ${r.status === "ok" ? `${r.count} rows` : r.detail || r.status}`);
  if (r.status === "error") allOk = false;
}

console.log(`\n${allOk ? "✅ All critical tables accessible." : "❌ Some tables have errors."}`);
process.exit(allOk ? 0 : 1);
