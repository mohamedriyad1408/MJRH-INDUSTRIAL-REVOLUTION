const { Client } = require('pg');
const fs = require('fs');

async function run() {
    const client = new Client({
        user: 'postgres',
        host: 'db.dngjfjrjddigqadlyain.supabase.co',
        database: 'postgres',
        password: '142536Mjhrf*#',
        port: 5432,
    });
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
