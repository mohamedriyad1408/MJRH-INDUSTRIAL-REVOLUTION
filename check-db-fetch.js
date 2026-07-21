const SUPABASE_URL = "https://dngjfjrjddigqadlyain.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JRp6rlQy0si3ZEA4WAHIYw_3dlJ4hfY";

async function checkTable(name) {
  const url = `${SUPABASE_URL}/rest/v1/${name}?select=*&limit=1`;
  const response = await fetch(url, {
    method: 'HEAD',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  if (response.status === 200 || response.status === 406) { // 406 might be content-type mismatch but table exists
    return true;
  }
  if (response.status === 401 || response.status === 403) {
    return true; // Exists but forbidden
  }
  if (response.status === 404) {
    return false;
  }
  return false;
}

async function checkDatabase() {
  console.log("--- Checking Database State via PostgREST ---");

  const coreTables = ['profiles', 'tenants', 'orders', 'customers', 'employees', 'inventory', 'user_roles', 'tenant_features'];
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
