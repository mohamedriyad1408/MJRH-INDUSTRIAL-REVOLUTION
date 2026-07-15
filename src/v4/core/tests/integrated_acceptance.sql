-- MJRH V4 — Integrated Acceptance Suite (L1-L2 Bond)
DO $$
DECLARE
    r1 uuid; r2 uuid; n1 uuid; n2 uuid; i1 uuid; i2 uuid; a1 uuid; a2 uuid;
BEGIN
    -- Setup two different Sovereign Roots in L1
    INSERT INTO v4_l1.identities (legal_name, global_urn, is_sovereign_root) VALUES ('Root A', 'urn:a', true) RETURNING id INTO r1;
    INSERT INTO v4_l1.identities (legal_name, global_urn, is_sovereign_root) VALUES ('Root B', 'urn:b', true) RETURNING id INTO r2;
    INSERT INTO v4_l1.nodes (identity_id, node_class) VALUES (r1, 'SOVEREIGN_ROOT') RETURNING id INTO n1;
    INSERT INTO v4_l1.nodes (identity_id, node_class) VALUES (r2, 'SOVEREIGN_ROOT') RETURNING id INTO n2;

    -- Setup L2 Actors and Positions
    INSERT INTO v4_l2.actors (identity_id, type) VALUES (r1, 'HUMAN') RETURNING id INTO a1;
    INSERT INTO v4_l2.positions (node_id, job_title) VALUES (n2, 'Manager in B') RETURNING id INTO i2;

    -- [TEST 1] Cross-Sovereign Leak (Should fail)
    RAISE NOTICE 'TEST 1: Attempting to assign Actor from Root A to Position in Root B...';
    BEGIN
        INSERT INTO v4_l2.assignments (actor_id, position_id, effective_range) 
        VALUES (a1, i2, tstzrange(now(), NULL));
        RAISE EXCEPTION 'FAIL: Sovereign boundary breached!';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = 'P1202' THEN RAISE NOTICE 'PASS: Sovereign Leak blocked.';
        ELSE RAISE EXCEPTION 'Unexpected error: %', SQLERRM; END IF;
    END;

    RAISE NOTICE 'INTEGRATED VERIFICATION v3.0: 100% SUCCESS.';
END $$;
