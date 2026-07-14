-- MJRH V4 — L3 Acceptance Suite v3.0 (Self-Asserting)
DO $$
DECLARE
    r1 uuid; n1 uuid; i1 uuid; a1 uuid := gen_random_uuid();
    _res jsonb;
BEGIN
    -- SETUP
    INSERT INTO v4_l1.identities (id, legal_name, global_urn, is_sovereign_root) VALUES ('00000000-0000-0000-0000-000000000010'::uuid, 'Corp Z', 'urn:corp:z', true) RETURNING id INTO r1;
    INSERT INTO v4_l1.nodes (id, identity_id, node_class) VALUES ('00000000-0000-0000-0000-000000000001'::uuid, r1, 'SOVEREIGN_ROOT') RETURNING id INTO n1;
    INSERT INTO v4_l3.capability_definitions (id, name_en, version) VALUES ('ops.verified', 'Verified Cap', '1');
    INSERT INTO v4_l3.capability_instances (id, definition_id, org_node_id) VALUES ('00000000-0000-0000-0000-000000000300'::uuid, 'ops.verified', n1) RETURNING id INTO i1;

    -- [TEST 1] Trigger Cycle Prevention
    BEGIN
        INSERT INTO v4_l3.capability_dependencies (dependent_id, dependency_id) VALUES ('ops.verified', 'ops.verified');
        RAISE EXCEPTION 'ASSERT_FAIL: Circular dependency allowed';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE <> 'P0001' THEN RAISE EXCEPTION 'ASSERT_FAIL: Expected P0001, got %', SQLSTATE; END IF;
    END;

    -- [TEST 2] Reservation Math
    INSERT INTO v4_l3.resource_registry (id, org_node_id, resource_type, total_capacity)
    VALUES ('00000000-0000-0000-0000-000000000888'::uuid, n1, 'EQUIPMENT', 10);
    
    INSERT INTO v4_l3.resource_reservations (resource_id, reserved_by_job_id, capacity_consumed, valid_until)
    VALUES ('00000000-0000-0000-0000-000000000888'::uuid, gen_random_uuid(), 9, now() + interval '1 hour');
    
    INSERT INTO v4_l3.capability_requirements (capability_id, resource_type, required_capacity)
    VALUES ('ops.verified', 'EQUIPMENT', 2);

    _res := v4_l3.fn_evaluate_readiness(i1);
    IF (_res->>'state' <> 'INSUFFICIENT_CAPACITY') THEN
        RAISE EXCEPTION 'ASSERT_FAIL: Capacity logic failed. Expected INSUFFICIENT_CAPACITY, got %', _res->>'state';
    END IF;

    -- [TEST 3] Governance Denial
    INSERT INTO v4_l2.policies (sovereign_id, name, policy_class, effect, action_scope)
    VALUES (r1, 'Hard Lock', 'LEGAL', 'DENY', 'capability.pulse');

    _res := v4_l3.fn_evaluate_readiness(i1, a1);
    IF (_res->>'state' <> 'POLICY_BLOCKED') THEN
        RAISE EXCEPTION 'ASSERT_FAIL: Governance integration failed. Got %', _res->>'state';
    END IF;

    RAISE NOTICE 'L3 ACCEPTANCE v3.0: 100% SUCCESS.';
END $$;
