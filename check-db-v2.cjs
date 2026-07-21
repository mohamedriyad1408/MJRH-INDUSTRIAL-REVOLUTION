const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://dngjfjrjddigqadlyain.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JRp6rlQy0si3ZEA4WAHIYw_3dlJ4hfY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    enabled: false
  }
});

async function checkTable(name) {
  const { error } = await supabase.from(name).select('*', { count: 'exact', head: true }).limit(1);
  if (error && error.code === '42P01') { // undefined_table
    return false;
  }
  if (error && error.message.includes('permission denied')) {
    return true; // Table exists but we can't see it (likely because of RLS or permission)
  }
  return true;
}

async function checkDatabase() {
  console.log("--- Checking Database State ---");

  const coreTables = ['profiles', 'tenants', 'orders', 'customers', 'employees', 'inventory', 'roles', 'permissions'];
  const v4Tables = ['capabilities', 'genome', 'capability_genome'];

  console.log("Checking core tables:");
  for (const table of coreTables) {
    const exists = await checkTable(table);
    console.log(`- ${table}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
  }

  console.log("\nChecking V4 tables:");
  for (const table of v4Tables) {
    const exists = await checkTable(table);
    console.log(`- ${table}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
  }
}

checkDatabase();
