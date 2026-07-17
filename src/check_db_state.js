import pg from 'pg';
const { Client } = pg;

const connectionString = "postgresql://postgres:142536Mjhrf*#@db.dngjfjrjddigqadlyain.supabase.co:5432/postgres";

async function run() {
    const client = new Client({ connectionString });
    await client.connect();
    try {
        console.log("Checking v4_l1.nodes...");
        const res = await client.query("SELECT id, node_path, current_state FROM v4_l1.nodes;");
        console.log(JSON.stringify(res.rows, null, 2));

        console.log("Checking public.tenants...");
        const res2 = await client.query("SELECT id, name, slug, is_active FROM public.tenants;");
        console.log(JSON.stringify(res2.rows, null, 2));
    } catch (err) {
        console.error(err.message);
    } finally {
        await client.end();
    }
}

run();
