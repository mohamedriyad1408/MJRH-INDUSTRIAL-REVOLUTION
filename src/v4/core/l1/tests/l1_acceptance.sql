-- MJRH V4 — Layer 1 Comprehensive Hermetic Acceptance Suite v3.0
DO $$
DECLARE
    _r1 uuid; _r2 uuid;
    _n1 uuid; _n2 uuid; _n3 uuid; _n4 uuid;
BEGIN
    RAISE NOTICE 'Starting Hermetic L1 Verification...';

    -- [1] Identity Registration
    INSERT INTO v4_l1.identities (legal_name, global_urn, is_sovereign_root) 
    VALUES ('Sovereign Org', 'urn:mjrh:root:' || gen_random_uuid(), true) RETURNING id INTO _r1;

    -- [2] Root Node Creation
    INSERT INTO v4_l1.nodes (identity_id, node_class) VALUES (_r1, 'SOVEREIGN_ROOT') RETURNING id INTO _n1;

    -- [3] Nested Structure
    INSERT INTO v4_l1.identities (legal_name, global_urn, is_sovereign_root) 
    VALUES ('Internal Dept', 'urn:mjrh:dept:' || gen_random_uuid(), false) RETURNING id INTO _r2;
    
    INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES (_r2, _n1, 'INTERNAL_NODE') RETURNING id INTO _n2;

    -- [4] ASSERT: Identity Path Recursion (Move Scenario)
    -- Create N3 with same identity as Root (_r1) in a separate branch (should allow if disjoint)
    -- Actually, currently our rule is 1:N but "Disjoint".
    -- Let's test the bloker: N1(_r1) -> N2(_r2). Attempt to put another node with _r1 under N2.
    BEGIN
        INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES (_r1, _n2, 'INTERNAL_NODE');
        RAISE EXCEPTION 'ASSERT_FAIL: Identity Recursion bypassed';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE <> 'P1103' THEN RAISE EXCEPTION 'ASSERT_FAIL: Expected P1103, got %', SQLSTATE; END IF;
    END;

    -- [5] ASSERT: Subtree Propagation (The "Move" Invariant)
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) 
    VALUES ('00000000-0000-0000-0000-00000000000a'::uuid, _r2, _n1, 'INTERNAL_NODE') RETURNING id INTO _n3;
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) 
    VALUES ('00000000-0000-0000-0000-00000000000b'::uuid, _r2, _n3, 'INTERNAL_NODE') RETURNING id INTO _n4;

    -- Move N3 (and child N4) under N2
    UPDATE v4_l1.nodes SET parent_id = _n2 WHERE id = _n3;
    
    IF nlevel((SELECT node_path FROM v4_l1.nodes WHERE id = _n4)) <> 4 THEN
        RAISE EXCEPTION 'ASSERT_FAIL: Subtree Propagation failed. Level %', nlevel((SELECT node_path FROM v4_l1.nodes WHERE id = _n4));
    END IF;

    -- [6] ASSERT: Delete Protection (ON DELETE RESTRICT)
    BEGIN
        DELETE FROM v4_l1.nodes WHERE id = _n1;
        RAISE EXCEPTION 'ASSERT_FAIL: Delete restriction bypassed';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE <> '23503' THEN RAISE EXCEPTION 'ASSERT_FAIL: Expected 23503, got %', SQLSTATE; END IF;
    END;

    RAISE NOTICE 'VERIFICATION SUCCESSFUL: 100% Core Invariants Passing.';
END $$;
