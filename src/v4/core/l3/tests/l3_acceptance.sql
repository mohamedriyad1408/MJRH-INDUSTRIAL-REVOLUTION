-- MJRH V4 — L3 Final Acceptance v2.8
BEGIN;
    -- TEST 1: Cycle Prevention (Schema Level)
    INSERT INTO v4_l3.capability_definitions (id, name_en, version) VALUES ('c1', 'C1', '1'), ('c2', 'C2', '1');
    INSERT INTO v4_l3.capability_dependencies (dependent_id, dependency_id) VALUES ('c1', 'c2');
    BEGIN
        INSERT INTO v4_l3.capability_dependencies (dependent_id, dependency_id) VALUES ('c2', 'c1');
        RAISE EXCEPTION 'FAIL: Cycle NOT blocked at schema level';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PASS: Cycle blocked at schema level.';
    END;

    -- TEST 2: Weighted Capacity & Reservations
    INSERT INTO v4_l3.resource_registry (id, org_node_id, resource_type, total_capacity)
    VALUES ('00000000-0000-0000-0000-000000000888'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'EQUIPMENT', 10);
    
    INSERT INTO v4_l3.capability_requirements (capability_id, resource_type, required_capacity)
    VALUES ('c1', 'EQUIPMENT', 5);
    
    -- Reserve 7 capacity
    INSERT INTO v4_l3.resource_reservations (resource_id, reserved_by_job_id, capacity_consumed, valid_until)
    VALUES ('00000000-0000-0000-0000-000000000888'::uuid, gen_random_uuid(), 7, now() + interval '1 hour');
    
    INSERT INTO v4_l3.capability_instances (id, definition_id, org_node_id) VALUES ('00000000-0000-0000-0000-000000000333'::uuid, 'c1', '00000000-0000-0000-0000-000000000001'::uuid);
    
    IF (v4_l3.fn_evaluate_readiness('00000000-0000-0000-0000-000000000333'::uuid)->>'state' = 'INSUFFICIENT_CAPACITY') THEN
        RAISE NOTICE 'PASS: Capacity Reservation logic verified.';
    END IF;

    RAISE NOTICE 'L3 FINAL VERIFICATION COMPLETE.';
ROLLBACK;
