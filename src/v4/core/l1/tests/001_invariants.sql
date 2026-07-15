-- L1 Invariant Test Suite
DO $$
DECLARE
    _root_id uuid;
    _node_a uuid;
    _node_b uuid;
    _ident_x uuid;
BEGIN
    RAISE NOTICE 'Starting L1 Invariant Tests...';

    -- Setup: Sovereign Root
    INSERT INTO v4_l1.identities (legal_name, global_urn, is_sovereign_root)
    VALUES ('Root Corp', 'urn:mjrh:root:1', true) RETURNING id INTO _ident_x;

    INSERT INTO v4_l1.nodes (identity_id, node_class)
    VALUES (_ident_x, 'SOVEREIGN_ROOT') RETURNING id INTO _root_id;

    -- TEST 1: Prevent Non-Sovereign Root
    BEGIN
        INSERT INTO v4_l1.identities (legal_name, global_urn, is_sovereign_root)
        VALUES ('Illegal Root', 'urn:mjrh:root:illegal', false) RETURNING id INTO _ident_x;
        INSERT INTO v4_l1.nodes (identity_id, node_class) VALUES (_ident_x, 'SOVEREIGN_ROOT');
        RAISE EXCEPTION 'FAIL: Allowed non-sovereign root';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE <> 'P1102' THEN RAISE EXCEPTION 'FAIL: Expected P1102, got % (%)', SQLSTATE, SQLERRM; END IF;
        RAISE NOTICE 'PASS: Root sovereignty enforced.';
    END;

    -- TEST 2: Cycle Detection
    INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class)
    VALUES (_ident_x, _root_id, 'INTERNAL_NODE') RETURNING id INTO _node_a;
    
    BEGIN
        UPDATE v4_l1.nodes SET parent_id = _node_a WHERE id = _root_id;
        RAISE EXCEPTION 'FAIL: Circular dependency allowed';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE <> 'P1104' THEN RAISE EXCEPTION 'FAIL: Expected P1104, got % (%)', SQLSTATE, SQLERRM; END IF;
        RAISE NOTICE 'PASS: Cycle detection enforced.';
    END;

    RAISE NOTICE 'L1 Invariant Tests Completed Successfully.';
END $$;
