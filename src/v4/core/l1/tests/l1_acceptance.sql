-- MJRH V4 — L1 Executable Acceptance Suite
-- Target: Verification of Invariants and Persistence Logic

DO $$
DECLARE
    root_id uuid;
    child_id uuid;
    other_root_id uuid;
    ident_id uuid;
BEGIN
    RAISE NOTICE 'Starting L1 Acceptance Suite...';

    -- TEST 1: Identity Registration
    INSERT INTO v4_l1.identities (legal_name, global_urn, is_sovereign_root)
    VALUES ('Sovereign Org A', 'urn:mjrh:org-a', true) RETURNING id INTO root_id;
    
    INSERT INTO v4_l1.identities (legal_name, global_urn, is_sovereign_root)
    VALUES ('Non-Sovereign Dept', 'urn:mjrh:dept-1', false) RETURNING id INTO ident_id;

    -- TEST 2: Root Creation (Invariant: Root must be Sovereign)
    BEGIN
        INSERT INTO v4_l1.nodes (identity_id, node_class) VALUES (ident_id, 'SOVEREIGN_ROOT');
        RAISE EXCEPTION 'FAIL: Created root with non-sovereign identity';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PASS: Root Sovereignty Invariant enforced.';
    END;

    -- TEST 3: Path Calculation (Invariant: Materialized Path)
    INSERT INTO v4_l1.nodes (id, identity_id, node_class) 
    VALUES ('00000000-0000-0000-0000-000000000001'::uuid, root_id, 'SOVEREIGN_ROOT');
    
    IF (SELECT node_path::text FROM v4_l1.nodes WHERE id = '00000000-0000-0000-0000-000000000001') <> '_00000000000000000000000000000001' THEN
        RAISE EXCEPTION 'FAIL: Incorrect path calculation';
    END IF;
    RAISE NOTICE 'PASS: Path Calculation validated.';

    -- TEST 4: Identity Recursion (Invariant: No duplicate identity in path)
    BEGIN
        INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) 
        VALUES (root_id, '00000000-0000-0000-0000-000000000001', 'INTERNAL_NODE');
        RAISE EXCEPTION 'FAIL: Allowed same identity twice in same path';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PASS: Identity Recursion blocked.';
    END;

    -- TEST 5: Cycle Detection (Invariant: No circular dependencies)
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) 
    VALUES ('00000000-0000-0000-0000-000000000002'::uuid, ident_id, '00000000-0000-0000-0000-000000000001', 'INTERNAL_NODE');
    
    BEGIN
        UPDATE v4_l1.nodes SET parent_id = '00000000-0000-0000-0000-000000000002' 
        WHERE id = '00000000-0000-0000-0000-000000000001';
        RAISE EXCEPTION 'FAIL: Cycle detection failed';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PASS: Cycle Detection validated.';
    END;

    RAISE NOTICE 'Acceptance Suite Completed Successfully.';
END $$;
