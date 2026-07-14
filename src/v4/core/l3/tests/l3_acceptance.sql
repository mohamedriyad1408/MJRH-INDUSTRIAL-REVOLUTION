-- MJRH V4 — L3 Acceptance Suite v2.0
BEGIN;
    -- SETUP
    INSERT INTO v4_l3.capability_definitions (id, name_en, version) VALUES ('cap.a', 'Cap A', '1'), ('cap.b', 'Cap B', '1'), ('cap.c', 'Cap C', '1');
    INSERT INTO v4_l3.capability_dependencies (dependent_id, dependency_id) VALUES ('cap.a', 'cap.b'), ('cap.b', 'cap.c'); -- A -> B -> C
    
    INSERT INTO v4_l3.capability_instances (id, definition_id, org_node_id, is_active)
    VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'cap.a', '00000000-0000-0000-0000-000000000001'::uuid, true),
           ('00000000-0000-0000-0000-000000000002'::uuid, 'cap.b', '00000000-0000-0000-0000-000000000001'::uuid, true),
           ('00000000-0000-0000-0000-000000000003'::uuid, 'cap.c', '00000000-0000-0000-0000-000000000001'::uuid, false);

    -- TEST 1: Recursive Dependency
    IF (v4_l3.fn_evaluate_readiness('00000000-0000-0000-0000-000000000001'::uuid)->>'state' = 'MISSING_DEPENDENCY') THEN
        RAISE NOTICE 'PASS: Recursive Dependency Resolver caught deep failure.';
    END IF;

    -- TEST 2: Capacity & Requirements
    UPDATE v4_l3.capability_instances SET is_active = true WHERE id = '00000000-0000-0000-0000-000000000003';
    INSERT INTO v4_l3.capability_requirements (capability_id, resource_type, min_quantity)
    VALUES ('cap.a', 'EQUIPMENT', 2);
    
    IF (v4_l3.fn_evaluate_readiness('00000000-0000-0000-0000-000000000001'::uuid)->>'state' = 'INSUFFICIENT_CAPACITY') THEN
        RAISE NOTICE 'PASS: Insufficient Capacity correctly identified.';
    END IF;

    RAISE NOTICE 'L3 VERIFICATION v2.0 COMPLETE.';
ROLLBACK;
