
import pg from 'pg';
import dns from 'node:dns';

// Force IPv4
dns.setDefaultResultOrder('ipv4first');

const client = new pg.Client({
  user: 'postgres',
  host: 'db.dngjfjrjddigqadlyain.supabase.co',
  database: 'postgres',
  password: '142536Mjhrf*#',
  port: 5432,
});

async function runSQL() {
  try {
    await client.connect();
    console.log("Connected to database");
    
    const res = await client.query('SELECT NOW()');
    console.log("Current time:", res.rows[0]);

    // Apply Sprint 4 and 5 Migrations here?
    // For now, just a test.
  } catch (e) {
    console.error("Connection failed:", e);
  } finally {
    await client.end();
  }
}

runSQL();
