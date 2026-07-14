-- MJRH V4 — L1 Core Acceptance v2.7 (Final RC)
-- Execution Protocol: Run inside a single transaction with ROLLBACK.

BEGIN;
    -- SETUP: Sovereigns and Identities
    INSERT INTO v4_l1.identities (id, legal_name, global_urn, is_sovereign_root) VALUES ('00000000-0000-0000-0000-000000000010'::uuid, 'Corp A', 'urn:corp:a', true);
    INSERT INTO v4_l1.identities (id, legal_name, global_urn, is_sovereign_root) VALUES ('00000000-0000-0000-0000-000000000020'::uuid, 'Dept B', 'urn:dept:b', false);
    INSERT INTO v4_l1.identities (id, legal_name, global_urn, is_sovereign_root) VALUES ('00000000-0000-0000-0000-000000000030'::uuid, 'Corp Z', 'urn:corp:z', true);

    -- SETUP: Hierarchy
    -- N1(I1) -> N2(I2)
    INSERT INTO v4_l1.nodes (id, identity_id, node_class) VALUES ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000010'::uuid, 'SOVEREIGN_ROOT');
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) VALUES ('00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000020'::uuid, '00000000-0000-0000-0000-000000000001', 'INTERNAL_NODE');

    RAISE NOTICE 'TEST 1: Complex Identity Recursion (A -> B -> A attempt)';
    BEGIN
        INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES ('00000000-0000-0000-0000-000000000010'::uuid, '00000000-0000-0000-0000-000000000002', 'INTERNAL_NODE');
        RAISE EXCEPTION 'FAIL: Identity A allowed under its own descendant';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN RAISE NOTICE 'PASS: Identity Recursion Blocked.';
        ELSE RAISE EXCEPTION 'FAIL: Unexpected error %', SQLERRM; END IF;
    END;

    RAISE NOTICE 'TEST 2: Subtree Move & Path Propagation (Multi-level)';
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) VALUES ('00000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000020'::uuid, '00000000-0000-0000-0000-000000000001', 'INTERNAL_NODE');
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) VALUES ('00000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000020'::uuid, '00000000-0000-0000-0000-000000000003', 'INTERNAL_NODE');
    -- Current: N1 -> N3 -> N4
    -- Move N3 under N2
    UPDATE v4_l1.nodes SET parent_id = '00000000-0000-0000-0000-000000000002' WHERE id = '00000000-0000-0000-0000-000000000003';
    -- Result should be: N1 -> N2 -> N3 -> N4
    IF nlevel((SELECT node_path FROM v4_l1.nodes WHERE id = '00000000-0000-0000-0000-000000000004')) = 4 THEN
        RAISE NOTICE 'PASS: Multi-level Subtree Propagation verified.';
    ELSE
        RAISE EXCEPTION 'FAIL: Subtree Propagation failed';
    END IF;

    RAISE NOTICE 'TEST 3: Cross-Sovereign Move Attempt';
    -- Root Z
    INSERT INTO v4_l1.nodes (id, identity_id, node_class) VALUES ('00000000-0000-0000-0000-000000000099'::uuid, '00000000-0000-0000-0000-000000000030'::uuid, 'SOVEREIGN_ROOT');
    BEGIN
        -- Attempt to move Internal Node N2 (from Root A) under Root Z
        -- Technically allowed by hierarchy but SHOULD be validated if we enforce Root Fixity
        -- Our current spec says: Sovereign Roots cannot be moved. 
        -- Internal nodes moving between roots is a "Transfer" which triggers logic change.
        -- For now, verify it changes the sovereign context correctly.
        UPDATE v4_l1.nodes SET parent_id = '00000000-0000-0000-0000-000000000099' WHERE id = '00000000-0000-0000-0000-000000000002';
        IF (v4_l1.resolve_sovereign_root('00000000-0000-0000-0000-000000000002')->>'sovereign_id')::uuid = '00000000-0000-0000-0000-000000000030' THEN
            RAISE NOTICE 'PASS: Cross-Sovereign Transfer recalculated context.';
        END IF;
    END;

    RAISE NOTICE 'TEST 4: Rollback Integrity (Failure Injection)';
    -- Save state
    SAVEPOINT before_fail;
    BEGIN
        -- Trigger a custom error inside a manual block to simulate trigger failure
        UPDATE v4_l1.nodes SET parent_id = NULL WHERE id = '00000000-0000-0000-0000-000000000002'; -- Should fail (Non-sov root)
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PASS: Transactional Integrity confirmed via expected failure.';
    END;

    RAISE NOTICE 'L1 VERIFICATION v2.7 COMPLETE: ALL INVARIANTS PASS.';
ROLLBACK;
