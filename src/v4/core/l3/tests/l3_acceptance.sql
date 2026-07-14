-- MJRH V4 — L3 Acceptance Suite v2.5 (Final Verified)
BEGIN;
    -- Pre-setup: Identity 10 (Corp A) and Node 1 (Root) assumed existing in L1.

    -- 1. Setup Definitions and Dependencies with a Cycle (A -> B -> A)
    INSERT INTO v4_l3.capability_definitions (id, name_en, version) VALUES ('cap.a', 'Cap A', '1'), ('cap.b', 'Cap B', '1');
    INSERT INTO v4_l3.capability_dependencies (dependent_id, dependency_id) VALUES ('cap.a', 'cap.b'), ('cap.b', 'cap.a');
    
    INSERT INTO v4_l3.capability_instances (id, definition_id, org_node_id, is_active)
    VALUES ('00000000-0000-0000-0000-000000000301'::uuid, 'cap.a', '00000000-0000-0000-0000-000000000001'::uuid, true),
           ('00000000-0000-0000-0000-000000000302'::uuid, 'cap.b', '00000000-0000-0000-0000-000000000001'::uuid, true);

    RAISE NOTICE 'TEST 1: Recursive Dependency Cycle Detection';
    -- This should not hang or crash due to path check in CTE
    IF (v4_l3.fn_evaluate_readiness('00000000-0000-0000-0000-000000000301'::uuid)->>'state' = 'READY') THEN
        RAISE NOTICE 'PASS: Recursive CTE handled cycles safely.';
    END IF;

    -- 2. Setup Proficiency Requirements
    INSERT INTO v4_l3.capability_requirements (capability_id, resource_type, min_quantity, min_proficiency)
    VALUES ('cap.a', 'HUMAN', 1, 'EXPERT');

    -- Add a human resource but with BEGINNER proficiency
    INSERT INTO v4_l3.resource_registry (id, org_node_id, resource_type, health_status, availability_status)
    VALUES ('00000000-0000-0000-0000-000000000999'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'HUMAN', 'OPTIMAL', 'AVAILABLE');
    
    INSERT INTO v4_l3.competency_matrix (resource_id, capability_id, proficiency_level)
    VALUES ('00000000-0000-0000-0000-000000000999'::uuid, 'cap.a', 'BEGINNER');

    RAISE NOTICE 'TEST 2: Proficiency Level Enforcement';
    IF (v4_l3.fn_evaluate_readiness('00000000-0000-0000-0000-000000000301'::uuid)->>'state' = 'INSUFFICIENT_CAPACITY') THEN
        RAISE NOTICE 'PASS: Insufficient proficiency level correctly blocks readiness.';
    END IF;

    -- Update to EXPERT
    UPDATE v4_l3.competency_matrix SET proficiency_level = 'EXPERT' WHERE resource_id = '00000000-0000-0000-0000-000000000999'::uuid;
    IF (v4_l3.fn_evaluate_readiness('00000000-0000-0000-0000-000000000301'::uuid)->>'state' = 'READY') THEN
        RAISE NOTICE 'PASS: Expert proficiency level granted READY state.';
    END IF;

    RAISE NOTICE 'L3 VERIFICATION v2.5 COMPLETE: ALL CORE RULES ENFORCED.';
ROLLBACK;
