
const supabaseUrl = "https://dngjfjrjddigqadlyain.supabase.co";
const supabaseKey = "sb_publishable_JRp6rlQy0si3ZEA4WAHIYw_3dlJ4hfY";

const tables = [
  'tenants', 'customers', 'orders', 'event_log', 
  'profiles', 'employees', 'employee_attendance', 
  'inventory', 'inventory_transactions', 'suppliers',
  'roles', 'invoices', 'payments'
];

async function checkTables() {
  console.log("--- R-001: Schema Audit (via Fetch) ---");
  for (const table of tables) {
    const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=count`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'count=exact'
      }
    });
    
    if (res.ok) {
      console.log(`✅ ${table}: EXISTS`);
    } else {
      if (res.status === 404) {
        console.log(`❌ ${table}: MISSING`);
      } else {
        console.log(`⚠️ ${table}: Status ${res.status} - ${res.statusText}`);
      }
    }
  }
}

checkTables().catch(console.error);
