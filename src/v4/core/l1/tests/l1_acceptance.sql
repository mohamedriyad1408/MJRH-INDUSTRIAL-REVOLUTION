-- src/v4/core/l1/tests/l1_acceptance.sql
DO $$
DECLARE
    _res jsonb;
BEGIN
    -- SETUP
    INSERT INTO v4_l1.identities (id, legal_name, global_urn, is_sovereign_root) VALUES ('00000000-0000-0000-0000-000000000010'::uuid, 'Corp A', 'urn:corp:a', true);
    INSERT INTO v4_l1.identities (id, legal_name, global_urn, is_sovereign_root) VALUES ('00000000-0000-0000-0000-000000000020'::uuid, 'Dept B', 'urn:dept:b', false);
    INSERT INTO v4_l1.identities (id, legal_name, global_urn, is_sovereign_root) VALUES ('00000000-0000-0000-0000-000000000030'::uuid, 'Dept C', 'urn:dept:c', false);

    INSERT INTO v4_l1.nodes (id, identity_id, node_class) VALUES ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000010'::uuid, 'SOVEREIGN_ROOT');
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) VALUES ('00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000020'::uuid, '00000000-0000-0000-0000-000000000001', 'INTERNAL_NODE');
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) VALUES ('00000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000030'::uuid, '00000000-0000-0000-0000-000000000001', 'INTERNAL_NODE');

    CREATE TEMP TABLE IF NOT EXISTS test_results (test_name text, result text);

    -- TEST 1: Identity Recursion (Blocked)
    BEGIN
        -- Attempt to add Identity 10 (Root) as a child of Node 2
        INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class) VALUES ('00000000-0000-0000-0000-000000000010'::uuid, '00000000-0000-0000-0000-000000000002', 'INTERNAL_NODE');
        INSERT INTO test_results VALUES ('Identity Recursion', 'FAIL');
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO test_results VALUES ('Identity Recursion', 'PASS (Blocked)');
    END;

    -- TEST 2: Cycle Detection (Blocked)
    BEGIN
        UPDATE v4_l1.nodes SET parent_id = '00000000-0000-0000-0000-000000000002' WHERE id = '00000000-0000-0000-0000-000000000001';
        INSERT INTO test_results VALUES ('Cycle Detection', 'FAIL');
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO test_results VALUES ('Cycle Detection', 'PASS (Blocked)');
    END;

    -- TEST 3: Path Propagation
    UPDATE v4_l1.nodes SET parent_id = '00000000-0000-0000-0000-000000000002' WHERE id = '00000000-0000-0000-0000-000000000003';
    IF nlevel((SELECT node_path FROM v4_l1.nodes WHERE id = '00000000-0000-0000-0000-000000000003')) = 3 THEN
        INSERT INTO test_results VALUES ('Path Propagation', 'PASS');
    ELSE
        INSERT INTO test_results VALUES ('Path Propagation', 'FAIL');
    END IF;

    -- TEST 4: Sovereign Context RPC
    _res := v4_l1.resolve_sovereign_root('00000000-0000-0000-0000-000000000003');
    IF (_res->>'sovereign_id')::uuid = '00000000-0000-0000-0000-000000000010'::uuid THEN
        INSERT INTO test_results VALUES ('Sovereign RPC', 'PASS');
    ELSE
        INSERT INTO test_results VALUES ('Sovereign RPC', 'FAIL (' || (_res->>'sovereign_id') || ')');
    END IF;

END $$;
SELECT * FROM test_results;
DROP TABLE test_results;