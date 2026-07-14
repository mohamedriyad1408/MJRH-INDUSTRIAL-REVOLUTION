-- MJRH V4 — L3 Final Acceptance v2.9
BEGIN;
    -- SETUP: Root Org & Node (L1 context)
    INSERT INTO v4_l3.capability_definitions (id, name_en, version) VALUES ('ops.core', 'Core Operations', '1');
    INSERT INTO v4_l3.capability_instances (id, definition_id, org_node_id) VALUES ('00000000-0000-0000-0000-000000000301'::uuid, 'ops.core', '00000000-0000-0000-0000-000000000001'::uuid);

    -- TEST 1: Competency & Proficiency
    INSERT INTO v4_l3.capability_requirements (capability_id, resource_type, min_quantity, min_proficiency)
    VALUES ('ops.core', 'HUMAN', 1, 'EXPERT');

    INSERT INTO v4_l3.resource_registry (id, org_node_id, resource_type, health_status)
    VALUES ('00000000-0000-0000-0000-000000000999'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'HUMAN', 'OPTIMAL');

    -- Attempt with BEGINNER competency
    INSERT INTO v4_l3.competency_matrix (resource_id, capability_id, proficiency_level)
    VALUES ('00000000-0000-0000-0000-000000000999'::uuid, 'ops.core', 'BEGINNER');

    IF (v4_l3.fn_evaluate_readiness('00000000-0000-0000-0000-000000000301'::uuid)->>'state' = 'INSUFFICIENT_CAPACITY') THEN
        RAISE NOTICE 'PASS: Competency proficiency enforced.';
    END IF;

    -- Update to EXPERT
    UPDATE v4_l3.competency_matrix SET proficiency_level = 'EXPERT' WHERE resource_id = '00000000-0000-0000-0000-000000000999'::uuid;
    IF (v4_l3.fn_evaluate_readiness('00000000-0000-0000-0000-000000000301'::uuid)->>'state' = 'READY') THEN
        RAISE NOTICE 'PASS: Readiness granted with Expert competency.';
    END IF;

    -- TEST 2: Internal Cycle Protection
    INSERT INTO v4_l3.capability_dependencies (dependent_id, dependency_id) VALUES ('ops.core', 'ops.core');
    -- Should not loop infinitely due to visited_path
    IF (v4_l3.fn_evaluate_readiness('00000000-0000-0000-0000-000000000301'::uuid)->>'state' = 'MISSING_DEPENDENCY') THEN
        RAISE NOTICE 'PASS: Internal CTE protection caught cycle.';
    END IF;

    RAISE NOTICE 'L3 FINAL VERIFICATION v2.9 COMPLETE.';
ROLLBACK;
