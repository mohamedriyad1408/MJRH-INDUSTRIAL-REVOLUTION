const SUPABASE_URL = "https://dngjfjrjddigqadlyain.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JRp6rlQy0si3ZEA4WAHIYw_3dlJ4hfY";

async function findTenant() {
  const email = "abdelnaser@mjrh.com";
  
  // We need to login or use a query that isn't restricted by RLS if possible, 
  // but since we only have anon key, we might need to find public tenants or 
  // assume the slug based on the email domain if that's how it's set up.
  // Actually, let's try to list public tenants first.
  
  const url = `${SUPABASE_URL}/rest/v1/tenants?select=id,name,slug&limit=50`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  const tenants = await response.json();
  console.log("Tenants found:", JSON.stringify(tenants, null, 2));
}

findTenant();
