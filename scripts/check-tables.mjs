
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://dngjfjrjddigqadlyain.supabase.co";
const supabaseKey = "REDACTED"; // Trying this key

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { enabled: false }
});

const tables = [
  'tenants', 'customers', 'orders', 'event_log', 
  'profiles', 'employees', 'employee_attendance', 
  'inventory', 'inventory_transactions', 'suppliers',
  'roles', 'invoices', 'payments'
];

async function checkTables() {
  console.log("--- R-001: Schema Audit (via Select) ---");
  for (const table of tables) {
    const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01') {
         console.log(`❌ ${table}: MISSING or ACCESS DENIED`);
      } else {
         console.log(`⚠️ ${table}: Error ${error.code} - ${error.message}`);
      }
    } else {
      console.log(`✅ ${table}: EXISTS`);
    }
  }
}

checkTables().catch(console.error);
