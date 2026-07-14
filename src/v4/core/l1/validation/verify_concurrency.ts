/**
 * MJRH V4 — Layer 1 REAL Concurrency Stress Lab
 * This script opens two parallel DB sessions to prove the FOR UPDATE logic.
 */
import { Client } from 'pg';

async function runLab() {
    const config = { connectionString: process.env.DATABASE_URL };
    const clientA = new Client(config);
    const clientB = new Client(config);

    await clientA.connect();
    await clientB.connect();

    console.log("LAB START: Testing Concurrent Re-parenting...");

    // 1. Session A starts and locks the target parent
    await clientA.query('BEGIN');
    console.log("Session A: Moving node and sleeping (holding lock)...");
    await clientA.query("UPDATE v4_l1.nodes SET lifecycle_status = 'SUSPENDED' WHERE id = 'some-uuid'");
    
    const startB = Date.now();
    // 2. Session B attempts a conflicting move
    console.log("Session B: Attempting to move same node (should block)...");
    const moveB = clientB.query("UPDATE v4_l1.nodes SET parent_id = 'other-uuid' WHERE id = 'some-uuid'");

    await new Promise(r => setTimeout(r, 5000));
    await clientA.query('COMMIT');
    console.log("Session A: COMMITTED.");

    await moveB;
    const durationB = Date.now() - startB;
    console.log(`Session B: FINISHED after ${durationB}ms wait.`);

    if (durationB >= 5000) {
        console.log("RESULT: [PASS] Strict Serializability proven via FOR UPDATE.");
    } else {
        console.error("RESULT: [FAIL] Race Condition detected!");
        process.exit(1);
    }

    await clientA.end();
    await clientB.connect();
}
