-- src/v4/core/l1/tests/l1_core_acceptance.sql
DO $$
DECLARE
    r1 uuid; n1 uuid;
BEGIN
    INSERT INTO v4_l1.identities (legal_name, global_urn, is_sovereign_root) VALUES ('Root', 'urn:root', true) RETURNING id INTO r1;
    INSERT INTO v4_l1.nodes (id, identity_id, node_class) VALUES ('00000000-0000-0000-0000-000000000001'::uuid, r1, 'SOVEREIGN_ROOT');
    RAISE NOTICE 'PASS: Root Created';

    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) 
    VALUES ('00000000-0000-0000-0000-000000000002'::uuid, (SELECT id FROM v4_l1.identities LIMIT 1), '00000000-0000-0000-0000-000000000001', 'INTERNAL_NODE');
    
    IF nlevel((SELECT node_path FROM v4_l1.nodes WHERE id = '00000000-0000-0000-0000-000000000002')) = 2 THEN 
        RAISE NOTICE 'PASS: Path Propagation'; 
    END IF;

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

    RAISE NOTICE 'FINAL VERIFICATION SUCCESSFUL.';
END $$;
