-- MJRH V4 — L1 Core Acceptance v3.2 (Hardened)
DO $$
DECLARE
    r1 uuid; r2 uuid; n1 uuid; n2 uuid; n3 uuid;
BEGIN
    -- [1] Setup Structure
    INSERT INTO v4_l1.identities (id, legal_name, global_urn, is_sovereign_root) VALUES (gen_random_uuid(), 'Corp A', 'urn:mjrh:a', true) RETURNING id INTO r1;
    INSERT INTO v4_l1.identities (id, legal_name, global_urn, is_sovereign_root) VALUES (gen_random_uuid(), 'Dept B', 'urn:mjrh:b', false) RETURNING id INTO r2;

    INSERT INTO v4_l1.nodes (id, identity_id, node_class) VALUES (gen_random_uuid(), r1, 'SOVEREIGN_ROOT') RETURNING id INTO n1;
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) VALUES (gen_random_uuid(), r2, n1, 'INTERNAL_NODE') RETURNING id INTO n2;

    -- [2] TEST: Descendant Identity Conflict (The leak fixed in Self-Audit)
    -- Create another root N3(Identity 2)
    INSERT INTO v4_l1.identities (id, legal_name, global_urn, is_sovereign_root) VALUES (gen_random_uuid(), 'Corp X', 'urn:mjrh:x', true);
    INSERT INTO v4_l1.nodes (id, identity_id, node_class) VALUES (gen_random_uuid(), (SELECT id FROM v4_l1.identities WHERE legal_name='Corp X'), 'SOVEREIGN_ROOT') RETURNING id INTO n3;

    -- Attempt to move N1(Identity 1) under N2(Identity 2) -> Should fail because N2 is already a child of N1.
    -- (Wait, the above is a cycle. Let's do a pure identity conflict)
    
    -- Scenario: Node Root(I1) -> Node Child(I2). Elsewhere: Node Other(I2).
    -- Attempt to move Root(I1) under Other(I2). 
    -- This results in path Other(I2).Root(I1).Child(I2) -> Identity 2 repeats!
    
    BEGIN
        UPDATE v4_l1.nodes SET parent_id = n3 WHERE id = n1;
        RAISE EXCEPTION 'FAIL: Subtree Identity Conflict allowed';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = 'P1103' THEN RAISE NOTICE 'PASS: Subtree Identity Conflict blocked.';
        ELSE RAISE EXCEPTION 'FAIL: Unexpected error %', SQLERRM; END IF;
    END;

    RAISE NOTICE 'L1 CORE v3.1 VERIFIED.';
END $$;
