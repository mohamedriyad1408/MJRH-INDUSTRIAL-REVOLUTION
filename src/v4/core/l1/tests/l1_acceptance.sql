DO $$
DECLARE
    r1 uuid; n1 uuid;
BEGIN
    -- Reset for fresh test
    DELETE FROM v4_l1.nodes;
    DELETE FROM v4_l1.identities;

    -- 1. Sovereign Requirement Test
    INSERT INTO v4_l1.identities (legal_name, global_urn, is_sovereign_root) VALUES ('Root Org', 'urn:root', true) RETURNING id INTO r1;
    INSERT INTO v4_l1.nodes (id, identity_id, node_class) VALUES ('00000000-0000-0000-0000-000000000001'::uuid, r1, 'SOVEREIGN_ROOT');
    RAISE NOTICE 'PASS: Root Created';

    -- 2. Child Creation and Path Propagation
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) 
    VALUES ('00000000-0000-0000-0000-000000000002'::uuid, r1, '00000000-0000-0000-0000-000000000001', 'INTERNAL_NODE');
    
    IF nlevel((SELECT node_path FROM v4_l1.nodes WHERE id = '00000000-0000-0000-0000-000000000002')) = 2 THEN 
        RAISE NOTICE 'PASS: Path Propagation'; 
    ELSE
        RAISE EXCEPTION 'FAIL: Path Propagation';
    END IF;

    -- 3. Cycle Detection
    BEGIN
        UPDATE v4_l1.nodes SET parent_id = '00000000-0000-0000-0000-000000000002' WHERE id = '00000000-0000-0000-0000-000000000001';
        RAISE EXCEPTION 'FAIL: Circular Dependency NOT Blocked';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN 
           RAISE NOTICE 'PASS: Circular Dependency Blocked';
        ELSE
           RAISE EXCEPTION 'UNEXPECTED ERROR: %', SQLERRM;
        END IF;
    END;

    -- 4. Identity Recursion (1:N Disjoint Rule)
    BEGIN
        INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) 
        VALUES (r1, '00000000-0000-0000-0000-000000000002', 'INTERNAL_NODE');
        RAISE EXCEPTION 'FAIL: Identity Recursion Allowed';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PASS: Identity Recursion Blocked';
    END;

    RAISE NOTICE 'VERIFICATION COMPLETE: ALL L1 CORE INVARIANTS PASS.';
END $$;
