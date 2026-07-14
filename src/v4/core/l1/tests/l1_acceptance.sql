-- MJRH V4 — L1 Core Acceptance v3.5 (Security Hardened)
DO $$
DECLARE
    r1 uuid; n1 uuid;
BEGIN
    -- SETUP
    INSERT INTO v4_l1.identities (id, legal_name, global_urn, is_sovereign_root) VALUES ('00000000-0000-0000-0000-000000000010'::uuid, 'Corp A', 'urn:corp:a', true) RETURNING id INTO r1;
    INSERT INTO v4_l1.nodes (id, identity_id, node_class) VALUES ('00000000-0000-0000-0000-000000000001'::uuid, r1, 'SOVEREIGN_ROOT') RETURNING id INTO n1;

    -- TEST: Identity URN Immutability (P1107)
    BEGIN
        UPDATE v4_l1.identities SET global_urn = 'urn:hacked' WHERE id = r1;
        RAISE EXCEPTION 'FAIL: URN was modified!';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = 'P1107' THEN RAISE NOTICE 'PASS: URN Immutability Enforced.';
        ELSE RAISE EXCEPTION 'FAIL: Unexpected error %', SQLERRM; END IF;
    END;

    -- TEST: Node Class Immutability (P1106)
    BEGIN
        UPDATE v4_l1.nodes SET node_class = 'INTERNAL_NODE' WHERE id = n1;
        RAISE EXCEPTION 'FAIL: Node Class was modified!';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = 'P1106' THEN RAISE NOTICE 'PASS: Node Class Immutability Enforced.';
        ELSE RAISE EXCEPTION 'FAIL: Unexpected error %', SQLERRM; END IF;
    END;

    RAISE NOTICE 'L1 BASTION VERIFIED: ALL ATTACK VECTORS CLOSED.';
END $$;
