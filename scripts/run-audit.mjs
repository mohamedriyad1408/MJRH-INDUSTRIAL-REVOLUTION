
import pg from 'pg';

const connectionString = "postgresql://postgres:142536Mjhrf*#@db.dngjfjrjddigqadlyain.supabase.co:5432/postgres";

async function runAudit() {
  const client = new pg.Client({
    user: 'postgres',
    host: 'db.dngjfjrjddigqadlyain.supabase.co',
    database: 'postgres',
    password: '142536Mjhrf*#',
    port: 5432,
  });
  await client.connect();

  console.log("--- R-001: Schema Audit ---");

  // 1. Check basic tables
  const tablesResult = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
      'tenants', 'customers', 'orders', 'event_log', 
      'users', 'employees', 'attendance', 
      'inventory', 'inventory_transactions', 'suppliers',
      'roles', 'invoices', 'payments', 'profiles'
    );
  `);
  console.log("\nExisting Tables:");
  tablesResult.rows.forEach(r => console.log(`- ${r.table_name}`));

  // 2. Check constraints on 'orders'
  const constraintsResult = await client.query(`
    SELECT 
      conname AS constraint_name,
      contype AS constraint_type,
      pg_get_constraintdef(oid) AS constraint_definition
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
    AND (conname LIKE '%qc%' OR conname LIKE '%delivery%');
  `).catch(e => ({ rows: [] }));
  console.log("\nConstraints on 'orders':");
  constraintsResult.rows.forEach(r => console.log(`- ${r.constraint_name}: ${r.constraint_definition}`));

  // 3. Check indexes
  const indexesResult = await client.query(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename IN ('orders', 'customers', 'employees', 'inventory');
  `);
  console.log("\nIndexes:");
  indexesResult.rows.forEach(r => console.log(`- ${r.indexname}`));

  // 4. Check RLS
  const rlsResult = await client.query(`
    SELECT schemaname, tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public';
  `);
  console.log("\nRLS Status:");
  rlsResult.rows.filter(r => r.rowsecurity).forEach(r => console.log(`- ${r.tablename}: RLS ENABLED`));

  await client.end();
}

runAudit().catch(console.error);
