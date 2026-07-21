const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://dngjfjrjddigqadlyain.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JRp6rlQy0si3ZEA4WAHIYw_3dlJ4hfY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDatabase() {
  console.log("--- Checking Database State ---");

  // 1. Basic tables
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', ['profiles', 'tenants', 'orders', 'customers', 'employees', 'inventory', 'roles', 'permissions']);

  if (tablesError) {
    console.error("Error checking tables:", tablesError);
  } else {
    console.log("Core tables found:", tables.map(t => t.table_name));
  }

  // 2. V4 tables
  const { data: v4Tables, error: v4Error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .or('table_name.ilike.%capability%,table_name.ilike.%genome%');

  if (v4Error) {
    console.error("Error checking V4 tables:", v4Error);
  } else {
    console.log("V4 tables found:", v4Tables.map(t => t.table_name));
  }

  // 3. Functions
  // Note: Anon key might not have access to pg_proc, but we'll try
  const { data: functions, error: functionsError } = await supabase
    .rpc('get_functions_metadata'); // Custom RPC if available, otherwise this might fail

  if (functionsError) {
    console.log("Could not check functions directly via RPC. This is expected with anon key.");
  } else {
    console.log("Functions found:", functions);
  }
}

checkDatabase();
