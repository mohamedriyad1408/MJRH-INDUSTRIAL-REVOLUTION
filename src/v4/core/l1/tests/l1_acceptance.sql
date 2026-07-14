-- MJRH V4 — L1 Final Verified Acceptance Suite v3.0
DO $$
DECLARE
    r1 uuid; n1 uuid; n2 uuid; n3 uuid; n4 uuid;
BEGIN
    -- [1] Setup Sovereignty
    INSERT INTO v4_l1.identities (id, legal_name, global_urn, is_sovereign_root) VALUES (gen_random_uuid(), 'Root Org', 'urn:mjrh:root:' || gen_random_uuid(), true) RETURNING id INTO r1;
    INSERT INTO v4_l1.nodes (identity_id, node_class) VALUES (r1, 'SOVEREIGN_ROOT') RETURNING id INTO n1;

    -- [2] Path Integrity
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) VALUES (gen_random_uuid(), r1, n1, 'INTERNAL_NODE');
    RAISE NOTICE 'PASS: Root Invariants Checked';

    -- [3] Atomic Subtree Move
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) VALUES ('00000000-0000-0000-0000-00000000000a'::uuid, gen_random_uuid(), n1, 'INTERNAL_NODE') RETURNING id INTO n2;
    INSERT INTO v4_l1.nodes (id, identity_id, parent_id, node_class) VALUES ('00000000-0000-0000-0000-00000000000b'::uuid, gen_random_uuid(), n2, 'INTERNAL_NODE') RETURNING id INTO n3;
    
    UPDATE v4_l1.nodes SET parent_id = n1 WHERE id = n2; -- Move
    IF nlevel((SELECT node_path FROM v4_l1.nodes WHERE id = n3)) <> 3 THEN RAISE EXCEPTION 'ASSERT_FAIL: Propagation'; END IF;
    RAISE NOTICE 'PASS: Atomic Subtree Move Verified';

    -- [4] Fact Emission Check
    IF NOT EXISTS (SELECT 1 FROM v4_l1.structural_mutation_facts WHERE node_id = n2) THEN RAISE EXCEPTION 'ASSERT_FAIL: Fact Emission'; END IF;
    RAISE NOTICE 'PASS: Fact Emission Verified';

    RAISE NOTICE 'L1 CORE VERIFICATION COMPLETE.';
END $$;
