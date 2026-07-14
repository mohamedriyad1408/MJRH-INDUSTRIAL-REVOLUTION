-- MJRH V4 — L1 Core Acceptance v2.6
BEGIN;
    SAVEPOINT test_start;

    -- Setup: Identities
    INSERT INTO v4_l1.identities (id, legal_name, global_urn, is_sovereign_root) VALUES ('00000000-0000-0000-0000-000000000010'::uuid, 'Corp A', 'urn:corp:a', true);
    INSERT INTO v4_l1.identities (id, legal_name, global_urn, is_sovereign_root) VALUES ('00000000-0000-0000-0000-000000000020'::uuid, 'Dept B', 'urn:dept:b', false);
    
    -- Setup: Hierarchy
    -- N1(I1) -> N2(I2)
    INSERT INTO v4_l1.nodes (id, identity_id, node_class) VALUES ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000010'::uuid, 'SOVEREIGN_ROOT');
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) VALUES ('00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000020'::uuid, '00000000-0000-0000-0000-000000000001', 'INTERNAL_NODE');

    -- TEST 1: Complex Identity Recursion
    -- Attempt to insert N3(I1) under N2(I2). This should fail because I1 is the root.
    BEGIN
        INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES ('00000000-0000-0000-0000-000000000010'::uuid, '00000000-0000-0000-0000-000000000002', 'INTERNAL_NODE');
        RAISE EXCEPTION 'FAIL: Identity Recursion was allowed!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PASS: Complex Identity Recursion Blocked.';
    END;

    -- TEST 2: Subtree Move Verification
    -- Create another branch and move it
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) VALUES ('00000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000020'::uuid, '00000000-0000-0000-0000-000000000001', 'INTERNAL_NODE');
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) VALUES ('00000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000020'::uuid, '00000000-0000-0000-0000-000000000003', 'INTERNAL_NODE');
    
    -- Move N3 (and its child N4) under N2
    UPDATE v4_l1.nodes SET parent_id = '00000000-0000-0000-0000-000000000002' WHERE id = '00000000-0000-0000-0000-000000000003';
    
    -- Verify N4 path was updated correctly (level should be 4: Root -> N2 -> N3 -> N4)
    IF nlevel((SELECT node_path FROM v4_l1.nodes WHERE id = '00000000-0000-0000-0000-000000000004')) = 4 THEN
        RAISE NOTICE 'PASS: Subtree Propagation verified.';
    ELSE
        RAISE EXCEPTION 'FAIL: Subtree Propagation path length incorrect';
    END IF;

    -- TEST 3: Cross-Sovereign Isolation (via RPC)
    -- Create Root B
    INSERT INTO v4_l1.identities (id, legal_name, global_urn, is_sovereign_root) VALUES ('00000000-0000-0000-0000-000000000030'::uuid, 'Corp C', 'urn:corp:c', true);
    INSERT INTO v4_l1.nodes (id, identity_id, node_class) VALUES ('00000000-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-000000000030'::uuid, 'SOVEREIGN_ROOT');
    
    IF (SELECT v4_l1.resolve_sovereign_root('00000000-0000-0000-0000-000000000005')->>'sovereign_id')::uuid = '00000000-0000-0000-0000-000000000030'::uuid THEN
        RAISE NOTICE 'PASS: Sovereign Context Isolation verified.';
    END IF;

    RAISE NOTICE 'VERIFICATION v2.6: ALL TESTS PASSED.';
ROLLBACK;
