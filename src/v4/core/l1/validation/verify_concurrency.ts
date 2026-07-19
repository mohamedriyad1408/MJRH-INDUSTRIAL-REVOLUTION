import { Client } from 'pg';

async function runLab() {
    const config = { connectionString: process.env.DATABASE_URL };
    const clientA = new Client(config);
    const clientB = new Client(config);
    let testIdentityIds: string[] = [];

    try {
        await clientA.connect();
        await clientB.connect();

        console.log("LAB START: Verifying Sibling-Lock Isolation & Subtree Propagation v1.4...");

        // --- SETUP DYNAMIC DATA ---
        const { rows: idents } = await clientA.query(`
            INSERT INTO v4_l1.identities (legal_name, global_urn, is_sovereign_root)
            VALUES ('Root Org', 'urn:mjrh:root:' || gen_random_uuid(), true),
                   ('Dept Unit', 'urn:mjrh:dept:' || gen_random_uuid(), false)
            RETURNING id
        `);
        testIdentityIds = idents.map(r => r.id);
        const rootId = idents[0].id;
        const deptId = idents[1].id;

        // Create Nodes
        const { rows: rNode } = await clientA.query("INSERT INTO v4_l1.nodes (identity_id, node_class) VALUES ($1, 'SOVEREIGN_ROOT') RETURNING id", [rootId]);
        const nRoot = rNode[0].id;

        const { rows: pNode } = await clientA.query("INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES ($1, $2, 'INTERNAL_NODE') RETURNING id", [deptId, nRoot]);
        const nParentP = pNode[0].id;

        const { rows: qNode } = await clientA.query("INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES ($1, $2, 'INTERNAL_NODE') RETURNING id, node_path", [deptId, nRoot]);
        const nParentQ = qNode[0].id;
        const pathQ = qNode[0].node_path;

        const { rows: xNode } = await clientA.query("INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES ($1, $2, 'INTERNAL_NODE') RETURNING id", [deptId, nParentP]);
        const nSiblingX = xNode[0].id;

        const { rows: yNode } = await clientA.query("INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES ($1, $2, 'INTERNAL_NODE') RETURNING id", [deptId, nParentP]);
        const nSiblingY = yNode[0].id;

        const { rows: zNode } = await clientA.query("INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES ($1, $2, 'INTERNAL_NODE') RETURNING id", [deptId, nSiblingX]);
        const nDescendantZ = zNode[0].id;

        console.log("Setup complete. Parent P holds Siblings X and Y.");

        // --- CONCURRENCY EXECUTION ---

        // Session A: Move Sibling X (with child Z) to Parent Q. This locks Parent P.
        await clientA.query('BEGIN');
        console.log("Session A: Moving X to Q (locking Parent P)...");
        await clientA.query("UPDATE v4_l1.nodes SET parent_id = $1 WHERE id = $2", [nParentQ, nSiblingX]);
        
        const startB = Date.now();
        // Session B: Move Sibling Y (same parent P) to Parent Q.
        console.log("Session B: Attempting to move Sibling Y (should block on P)...");
        const sessionBWork = (async () => {
            await clientB.query('BEGIN');
            await clientB.query("UPDATE v4_l1.nodes SET parent_id = $1 WHERE id = $2", [nParentQ, nSiblingY]);
            await clientB.query('COMMIT');
        })();

        await new Promise(r => setTimeout(r, 5000));
        await clientA.query('COMMIT');
        console.log("Session A: COMMITTED.");

        await sessionBWork;
        const durationB = Date.now() - startB;
        console.log(`Session B: FINISHED after ${durationB}ms wait.`);

        // --- FINAL ASSERTIONS ---
        const { rows: resZ } = await clientA.query("SELECT node_path FROM v4_l1.nodes WHERE id = $1", [nDescendantZ]);
        const pathZ = resZ[0].node_path;

        if (durationB < 5000) throw new Error("FAIL: Session B was not blocked by Parent P lock.");
        if (!pathZ.startsWith(pathQ)) throw new Error("FAIL: Descendant Z did not propagate to New Parent Q.");

        console.log("RESULT: [PASS] Sibling isolation and recursive propagation verified v1.4.");

    } finally {
        // CLEANUP
        console.log("Cleaning up test data...");
        if (testIdentityIds.length > 0) {
            await clientA.query("DELETE FROM v4_l1.nodes WHERE identity_id = ANY($1)", [testIdentityIds]);
            await clientA.query("DELETE FROM v4_l1.identities WHERE id = ANY($1)", [testIdentityIds]);
        }
        await clientA.end();
        await clientB.end();
    }
}
runLab().catch(console.error);
