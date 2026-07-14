-- MJRH V4 — L1 Final Self-Asserting Acceptance Suite
-- Rule: Every failure MUST RAISE EXCEPTION. No NOTICE for Pass.
DO $$
DECLARE
    r1 uuid; r2 uuid; n1 uuid; n2 uuid; n3 uuid; n4 uuid;
    _path ltree;
BEGIN
    -- [1] Identity Setup
    INSERT INTO v4_l1.identities (id, legal_name, global_urn, is_sovereign_root) VALUES ('00000000-0000-0000-0000-000000000010'::uuid, 'Corp A', 'urn:corp:a', true) RETURNING id INTO r1;
    INSERT INTO v4_l1.identities (id, legal_name, global_urn, is_sovereign_root) VALUES ('00000000-0000-0000-0000-000000000020'::uuid, 'Dept B', 'urn:dept:b', false) RETURNING id INTO r2;

    -- [2] Basic Creation
    INSERT INTO v4_l1.nodes (id, identity_id, node_class) VALUES ('00000000-0000-0000-0000-000000000001'::uuid, r1, 'SOVEREIGN_ROOT') RETURNING id INTO n1;
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) VALUES ('00000000-0000-0000-0000-000000000002'::uuid, r2, n1, 'INTERNAL_NODE') RETURNING id INTO n2;

    -- [3] Cycle Detection Assert
    BEGIN
        UPDATE v4_l1.nodes SET parent_id = n2 WHERE id = n1;
        RAISE EXCEPTION 'ASSERT_FAIL: Cycle Detection bypassed';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%Circular dependency detected%' THEN RAISE EXCEPTION 'ASSERT_FAIL: Wrong cycle error: %', SQLERRM; END IF;
    END;

    -- [4] Identity Recursion Assert
    BEGIN
        INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES (r1, n2, 'INTERNAL_NODE');
        RAISE EXCEPTION 'ASSERT_FAIL: Identity Recursion bypassed';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%Identity Recursion in Path%' THEN RAISE EXCEPTION 'ASSERT_FAIL: Wrong recursion error: %', SQLERRM; END IF;
    END;

    -- [5] Subtree Propagation Assert
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) VALUES ('00000000-0000-0000-0000-000000000003'::uuid, r2, n1, 'INTERNAL_NODE') RETURNING id INTO n3;
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) VALUES ('00000000-0000-0000-0000-000000000004'::uuid, r2, n3, 'INTERNAL_NODE') RETURNING id INTO n4;
    
    -- Move n3 (and child n4) under n2
    UPDATE v4_l1.nodes SET parent_id = n2 WHERE id = n3;
    
    IF nlevel((SELECT node_path FROM v4_l1.nodes WHERE id = n4)) <> 4 THEN
        RAISE EXCEPTION 'ASSERT_FAIL: Subtree Propagation failed. N4 path: %', (SELECT node_path FROM v4_l1.nodes WHERE id = n4);
    END IF;

    -- [6] Rollback Integrity Assert
    -- We'll try a move that fails at the end (using a sub-block)
    BEGIN
        UPDATE v4_l1.nodes SET parent_id = n4 WHERE id = n1; -- Fails (Cycle)
    EXCEPTION WHEN OTHERS THEN
        -- Integrity Check: n1 must still have its original path
        IF (SELECT node_path FROM v4_l1.nodes WHERE id = n1)::text <> '_00000000000000000000000000000001' THEN
            RAISE EXCEPTION 'ASSERT_FAIL: Rollback Integrity failed. Path corrupted.';
        END IF;
    END;

    RAISE NOTICE 'SUCCESS: Layer 1 Core Acceptance verified.';
END $$;
