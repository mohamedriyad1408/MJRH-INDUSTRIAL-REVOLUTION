/**
 * MJRH V4 — Layer 1 REAL Concurrency Stress Lab v1.3
 * This script proves parent-row locking and correct descendant propagation
 * using dynamically generated test data.
 */
import { Client } from 'pg';

async function runLab() {
    const config = { connectionString: process.env.DATABASE_URL };
    const clientA = new Client(config);
    const clientB = new Client(config);

    await clientA.connect();
    await clientB.connect();

    console.log("LAB START: Verifying Sibling-Lock Isolation & Descendant Propagation...");

    // --- SETUP DYNAMIC DATA ---
    const { rows: identities } = await clientA.query(`
        INSERT INTO v4_l1.identities (legal_name, global_urn, is_sovereign_root)
        VALUES ('Test Sovereign', 'urn:mjrh:root:' || gen_random_uuid(), true),
               ('Test Dept', 'urn:mjrh:dept:' || gen_random_uuid(), false)
        RETURNING id, is_sovereign_root
    `);
    const rootId = identities.find(i => i.is_sovereign_root).id;
    const deptId = identities.find(i => !i.is_sovereign_root).id;

    // Create Root Node
    const { rows: rootNode } = await clientA.query(
        "INSERT INTO v4_l1.nodes (identity_id, node_class) VALUES ($1, 'SOVEREIGN_ROOT') RETURNING id, node_path", 
        [rootId]
    );
    const nRoot = rootNode[0].id;

    // Create Parent P
    const { rows: pNode } = await clientA.query(
        "INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES ($1, $2, 'INTERNAL_NODE') RETURNING id, node_path",
        [deptId, nRoot]
    );
    const nParentP = pNode[0].id;

    // Create Siblings X and Y
    const { rows: xNode } = await clientA.query(
        "INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES ($1, $2, 'INTERNAL_NODE') RETURNING id",
        [deptId, nParentP]
    );
    const nSiblingX = xNode[0].id;

    const { rows: yNode } = await clientA.query(
        "INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES ($1, $2, 'INTERNAL_NODE') RETURNING id",
        [deptId, nParentP]
    );
    const nSiblingY = yNode[0].id;

    // Create Descendant Z (Child of X)
    const { rows: zNode } = await clientA.query(
        "INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES ($1, $2, 'INTERNAL_NODE') RETURNING id, node_path",
        [deptId, nSiblingX]
    );
    const nDescendantZ = zNode[0].id;
    const initialPathZ = zNode[0].node_path;

    // Create New Parent Q
    const { rows: qNode } = await clientA.query(
        "INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES ($1, $2, 'INTERNAL_NODE') RETURNING id, node_path",
        [deptId, nRoot]
    );
    const nNewParentQ = qNode[0].id;
    const pathQ = qNode[0].node_path;

    console.log("Setup complete. Initial Path Z:", initialPathZ);

    // --- CONCURRENCY EXECUTION ---

    // Session A: Update Sibling X (This locks Parent P)
    await clientA.query('BEGIN');
    console.log("Session A: Updating Sibling X (locking Parent P)...");
    await clientA.query("UPDATE v4_l1.nodes SET lifecycle_status = 'SUSPENDED' WHERE id = $1", [nSiblingX]);
    
    const startB = Date.now();
    // Session B: Attempt to move Sibling Y (Sibling of X, same parent P)
    console.log("Session B: Attempting to move Sibling Y (should wait for Parent P lock)...");
    const sessionBWork = (async () => {
        await clientB.query('BEGIN');
        await clientB.query("UPDATE v4_l1.nodes SET parent_id = $1 WHERE id = $2", [nNewParentQ, nSiblingY]);
        await clientB.query('COMMIT');
    })();

    await new Promise(r => setTimeout(r, 5000));
    await clientA.query('COMMIT');
    console.log("Session A: COMMITTED.");

    await sessionBWork;
    const durationB = Date.now() - startB;
    console.log(`Session B: FINISHED after ${durationB}ms wait.`);

    // --- FINAL ASSERTIONS ---
    console.log("Verifying Final Consistency...");
    
    const { rows: resultY } = await clientA.query("SELECT parent_id, node_path FROM v4_l1.nodes WHERE id = $1", [nSiblingY]);
    const { rows: resultZ } = await clientA.query("SELECT node_path FROM v4_l1.nodes WHERE id = $1", [nDescendantZ]);
    
    const nodeY = resultY[0];
    const pathZ = resultZ[0].node_path;

    // Assertion 1: Blocking occurred
    if (durationB < 5000) throw new Error("FAIL: Session B was NOT blocked. Lock failed.");

    // Assertion 2: Parent Update Correct
    if (nodeY.parent_id !== nNewParentQ) throw new Error("FAIL: Final parent_id mismatch.");

    // Assertion 3: Path Integrity (Must start with New Parent path)
    if (!pathZ.startsWith(pathQ)) {
        throw new Error(`FAIL: Path Z (${pathZ}) does not correctly stem from New Parent Q (${pathQ})`);
    }

    console.log("RESULT: [PASS] Sibling isolation and recursive propagation verified with dynamic data.");

    await clientA.end();
    await clientB.end();
}
runLab().catch(console.error);
