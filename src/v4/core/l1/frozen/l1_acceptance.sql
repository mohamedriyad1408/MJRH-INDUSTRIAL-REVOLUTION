-- MJRH V4 — Layer 1 Final Hermetic Acceptance Suite v3.1 (FROZEN)
-- Protocol: No hardcoded IDs. Self-Asserting exceptions.
DO $$
DECLARE
    -- Dynamic Identity Handles
    _r1 uuid; _r2 uuid;
    -- Dynamic Node Handles
    _n1 uuid; _n2 uuid; _n3 uuid; _n4 uuid;
BEGIN
    RAISE NOTICE 'Starting Frozen L1 Verification Suite...';

    -- [1] Identity Setup
    INSERT INTO v4_l1.identities (legal_name, global_urn, is_sovereign_root) 
    VALUES ('Corp Root', 'urn:mjrh:root:' || gen_random_uuid(), true) RETURNING id INTO _r1;

    INSERT INTO v4_l1.identities (legal_name, global_urn, is_sovereign_root) 
    VALUES ('Internal Dept', 'urn:mjrh:dept:' || gen_random_uuid(), false) RETURNING id INTO _r2;

    -- [2] Basic Topology Creation
    INSERT INTO v4_l1.nodes (identity_id, node_class) VALUES (_r1, 'SOVEREIGN_ROOT') RETURNING id INTO _n1;
    INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES (_r2, _n1, 'INTERNAL_NODE') RETURNING id INTO _n2;

    -- [3] Cycle Detection Assert (P1104)
    BEGIN
        UPDATE v4_l1.nodes SET parent_id = _n2 WHERE id = _n1;
        RAISE EXCEPTION 'ASSERT_FAIL: Cycle Detection bypassed';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE <> 'P1104' THEN RAISE EXCEPTION 'ASSERT_FAIL: Expected P1104, got %', SQLSTATE; END IF;
    END;

    -- [4] Identity Recursion Assert (P1103)
    BEGIN
        INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES (_r1, _n2, 'INTERNAL_NODE');
        RAISE EXCEPTION 'ASSERT_FAIL: Identity Recursion bypassed';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE <> 'P1103' THEN RAISE EXCEPTION 'ASSERT_FAIL: Expected P1103, got %', SQLSTATE; END IF;
    END;

    -- [5] Subtree Move and Atomic Propagation Assert
    INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES (_r2, _n1, 'INTERNAL_NODE') RETURNING id INTO _n3;
    INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES (_r2, _n3, 'INTERNAL_NODE') RETURNING id INTO _n4;

    -- Move n3 (and child n4) under n2
    UPDATE v4_l1.nodes SET parent_id = _n2 WHERE id = _n3;
    
    IF nlevel((SELECT node_path FROM v4_l1.nodes WHERE id = _n4)) <> 4 THEN
        RAISE EXCEPTION 'ASSERT_FAIL: Subtree Propagation failed. Level %', nlevel((SELECT node_path FROM v4_l1.nodes WHERE id = _n4));
    END IF;

    -- [6] Delete Protection Assert
    BEGIN
        DELETE FROM v4_l1.nodes WHERE id = _n1;
        RAISE EXCEPTION 'ASSERT_FAIL: Delete restriction bypassed';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE <> '23503' THEN RAISE EXCEPTION 'ASSERT_FAIL: Expected 23503, got %', SQLSTATE; END IF;
    END;

    RAISE NOTICE 'VERIFICATION SUCCESSFUL: Layer 1 Frozen Core Verified.';
END $$;
