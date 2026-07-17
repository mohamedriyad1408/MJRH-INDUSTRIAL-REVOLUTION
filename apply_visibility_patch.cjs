const { Client } = require('pg');
const fs = require('fs');

const connectionString = "postgresql://postgres:142536Mjhrf*%23@db.dngjfjrjddigqadlyain.supabase.co:5432/postgres";

async function run() {
    const client = new Client({ connectionString });
    await client.connect();
    try {
        console.log("Applying public visibility patch...");
        const sql = fs.readFileSync('supabase/migrations/20260717000003_v4_public_visibility.sql', 'utf8');
        await client.query(sql);
        console.log("SUCCESS");
    } catch (err) {
        console.error(err.message);
    } finally {
        await client.end();
    }
}

run();
