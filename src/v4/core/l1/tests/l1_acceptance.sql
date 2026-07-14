-- MJRH V4 — Layer 1 Final Hermetic Acceptance Suite v2.8
DO $$
DECLARE
    _r1 uuid; _r2 uuid;
    _n1 uuid; _n2 uuid; _n3 uuid; _n4 uuid;
BEGIN
    RAISE NOTICE 'Starting Hermetic L1 Acceptance Suite...';

    -- [1] Setup
    INSERT INTO v4_l1.identities (legal_name, global_urn, is_sovereign_root) 
    VALUES ('Corp Root', 'urn:mjrh:root:' || gen_random_uuid(), true) RETURNING id INTO _r1;

    -- [2] Root Node
    INSERT INTO v4_l1.nodes (identity_id, node_class) VALUES (_r1, 'SOVEREIGN_ROOT') RETURNING id INTO _n1;

    -- [3] Cycle Detection (P1104)
    INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) 
    VALUES ((SELECT id FROM v4_l1.identities LIMIT 1), _n1, 'INTERNAL_NODE') RETURNING id INTO _n2;
    
    BEGIN
        UPDATE v4_l1.nodes SET parent_id = _n2 WHERE id = _n1;
        RAISE EXCEPTION 'FAIL: Circular dependency bypassed';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE <> 'P1104' THEN RAISE EXCEPTION 'FAIL: Expected P1104, got %', SQLSTATE; END IF;
    END;

    -- [4] Identity Recursion (P1103)
    BEGIN
        INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES (_r1, _n2, 'INTERNAL_NODE');
        RAISE EXCEPTION 'FAIL: Identity Recursion bypassed';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE <> 'P1103' THEN RAISE EXCEPTION 'FAIL: Expected P1103, got %', SQLSTATE; END IF;
    END;

    -- [5] Subtree Move and Atomic Propagation
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) 
    VALUES ('00000000-0000-0000-0000-00000000000a'::uuid, (SELECT id FROM v4_l1.identities LIMIT 1), _n1, 'INTERNAL_NODE') RETURNING id INTO _n3;
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) 
    VALUES ('00000000-0000-0000-0000-00000000000b'::uuid, (SELECT id FROM v4_l1.identities LIMIT 1), _n3, 'INTERNAL_NODE') RETURNING id INTO _n4;

    UPDATE v4_l1.nodes SET parent_id = _n2 WHERE id = _n3;
    
    IF nlevel((SELECT node_path FROM v4_l1.nodes WHERE id = _n4)) <> 4 THEN
        RAISE EXCEPTION 'FAIL: Subtree Propagation failed';
    END IF;

    RAISE NOTICE 'SUCCESS: L1 Core v2.8 Acceptance verified.';
END $$;
