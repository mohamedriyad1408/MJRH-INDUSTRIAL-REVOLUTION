
import pg from 'pg';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const client = new pg.Client({
  user: 'postgres',
  host: 'db.dngjfjrjddigqadlyain.supabase.co',
  database: 'postgres',
  password: '142536Mjhrf*#',
  port: 5432,
});

async function cleanup() {
  try {
    await client.connect();
    console.log("Connected to database for cleanup.");

    // 1. Delete all tenants except dry-tech
    const res = await client.query("DELETE FROM tenants WHERE slug != 'dry-tech' RETURNING slug, name");
    console.log(`Deleted ${res.rowCount} tenants:`);
    res.rows.forEach(r => console.log(`- ${r.name} (${r.slug})`));

    // 2. Ensure RLS is enabled on core tables
    const tables = ['tenants', 'orders', 'customers', 'employees', 'profiles', 'inventory', 'invoices', 'payments'];
    for (const table of tables) {
      await client.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
      console.log(`RLS ensured for ${table}.`);
    }

    console.log("Cleanup complete.");
  } catch (e) {
    console.error("Cleanup failed:", e);
  } finally {
    await client.end();
  }
}

cleanup();
