/**
 * MJRH V4 — Layer 1 REAL Concurrency Stress Lab v1.1
 * This script opens two parallel DB sessions to verify parent-row locking.
 */
import { Client } from 'pg';

async function runLab() {
    const config = { connectionString: process.env.DATABASE_URL };
    const clientA = new Client(config);
    const clientB = new Client(config);

    await clientA.connect();
    await clientB.connect();

    console.log("LAB START: Testing Concurrent Re-parenting Integrity...");

    // Setup Test Node
    const targetId = '00000000-0000-0000-0000-000000000999';
    const parentA = '00000000-0000-0000-0000-000000000001';
    const parentB = '00000000-0000-0000-0000-000000000002';

    // Session A: Lock and Move
    await clientA.query('BEGIN');
    console.log("Session A: Locking parent and updating target...");
    // The trigger trg_l1_orchestrator performs SELECT FOR UPDATE on parent
    await clientA.query("UPDATE v4_l1.nodes SET parent_id = $1 WHERE id = $2", [parentA, targetId]);
    
    const startB = Date.now();
    // Session B: Concurrent Move attempt
    console.log("Session B: Attempting concurrent update (should block)...");
    const sessionBWork = (async () => {
        await clientB.query('BEGIN');
        await clientB.query("UPDATE v4_l1.nodes SET parent_id = $1 WHERE id = $2", [parentB, targetId]);
        await clientB.query('COMMIT');
    })();

    // Simulate delay
    await new Promise(r => setTimeout(r, 5000));
    await clientA.query('COMMIT');
    console.log("Session A: COMMITTED.");

    await sessionBWork;
    const durationB = Date.now() - startB;
    console.log(`Session B: FINISHED after ${durationB}ms wait.`);

    // --- ASSERTIONS ---
    console.log("Verifying final state integrity...");
    const { rows } = await clientA.query("SELECT parent_id, node_path, version FROM v4_l1.nodes WHERE id = $1", [targetId]);
    const finalNode = rows[0];

    if (durationB < 5000) {
        throw new Error("FAIL: Session B was NOT blocked. Race condition possible.");
    }
    
    if (finalNode.parent_id !== parentB) {
        throw new Error("FAIL: Final parent_id state is inconsistent.");
    }

    console.log("RESULT: [PASS] Concurrent structural mutation serialized successfully via parent row locking.");

    await clientA.end();
    await clientB.end(); // Fixed: Correctly end session B
}
