import pg from 'pg';
const { Client } = pg;

const connectionString = "postgresql://postgres:142536Mjhrf*#@db.dngjfjrjddigqadlyain.supabase.co:5432/postgres";

async function run() {
    const client = new Client({ connectionString });
    await client.connect();
    try {
        console.log("Ensuring dry_tech_cairo is ACTIVE...");
        await client.query("UPDATE v4_l1.nodes SET current_state = 'ACTIVE' WHERE node_path = 'dry_tech_cairo';");
        const res = await client.query("SELECT id, node_path, current_state FROM v4_l1.nodes WHERE node_class = 'SOVEREIGN_ROOT';");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err.message);
    } finally {
        await client.end();
    }
}

run();
