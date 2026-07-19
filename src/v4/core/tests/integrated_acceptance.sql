-- MJRH V4 — Final Hermetic Acceptance Suite
DO $$
DECLARE
    _root_id uuid;
    _node_id uuid;
    _cap_id text := 'core.test.' || replace(gen_random_uuid()::text, '-', '');
    _instance_id uuid;
    _res jsonb;
BEGIN
    -- L1 Setup
    INSERT INTO v4_l1.identities (legal_name, global_urn, is_sovereign_root) 
    VALUES ('Sovereign Test Entity', 'urn:mjrh:test:' || gen_random_uuid(), true) RETURNING id INTO _root_id;
    INSERT INTO v4_l1.nodes (identity_id, node_class) VALUES (_root_id, 'SOVEREIGN_ROOT') RETURNING id INTO _node_id;

    -- L3 Setup
    INSERT INTO v4_l3.capability_definitions (id, name_en, version) VALUES (_cap_id, 'Integrated Test', '1.0');
    INSERT INTO v4_l3.capability_instances (definition_id, org_node_id) VALUES (_cap_id, _node_id) RETURNING id INTO _instance_id;

    -- Test Logic
    _res := v4_l3.fn_evaluate_readiness(_instance_id);
    IF (_res->>'state' <> 'READY') THEN RAISE EXCEPTION 'Integrated Test Failed. Expected READY, got %', _res->>'state'; END IF;

    RAISE NOTICE 'INTEGRATED CORE VERIFICATION: PASSED';
END $$;
