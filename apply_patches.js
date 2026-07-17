const { Client } = require('pg');
const fs = require('fs');

const connectionString = "postgresql://postgres:142536Mjhrf*#@db.dngjfjrjddigqadlyain.supabase.co:5432/postgres";

async function applyFile(filePath) {
    console.log("Applying: " + filePath);
    const sql = fs.readFileSync(filePath, 'utf8');
    const client = new Client({ connectionString });
    await client.connect();
    try {
        await client.query(sql);
        console.log("SUCCESS: " + filePath);
    } catch (err) {
        console.error("ERROR in " + filePath + ": " + err.message);
    } finally {
        await client.end();
    }
}

async function run() {
    try {
        await applyFile('supabase/migrations/20260716000000_v4_patch_security.sql');
        await applyFile('supabase/migrations/20260716000001_v4_patch_performance.sql');
    } catch (e) {
        console.error("Runner failed: " + e.message);
    }
}

run();
