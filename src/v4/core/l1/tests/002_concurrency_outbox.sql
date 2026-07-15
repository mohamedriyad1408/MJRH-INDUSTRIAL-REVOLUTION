-- L1 Concurrency & Outbox Test Suite
DO $$
DECLARE
    _root_id uuid;
    _node_id uuid;
    _ident_id uuid;
BEGIN
    RAISE NOTICE 'Starting L1 Concurrency & Outbox Tests...';

    -- Setup
    INSERT INTO v4_l1.identities (legal_name, global_urn, is_sovereign_root)
    VALUES ('Audit Corp', 'urn:mjrh:audit:1', true) RETURNING id INTO _ident_id;
    INSERT INTO v4_l1.nodes (identity_id, node_class)
    VALUES (_ident_id, 'SOVEREIGN_ROOT') RETURNING id INTO _root_id;

    -- TEST 1: Fact Emission on Insert
    IF NOT EXISTS (SELECT 1 FROM v4_l1.structural_outbox WHERE aggregate_id = _root_id AND event_type = 'NodeCreated') THEN
        RAISE EXCEPTION 'FAIL: Fact not emitted for NodeCreated';
    END IF;
    RAISE NOTICE 'PASS: Fact emission verified.';

    -- TEST 2: Optimistic Locking (Version Check)
    BEGIN
        UPDATE v4_l1.nodes SET version = 999 WHERE id = _root_id;
        RAISE EXCEPTION 'FAIL: Bypassed optimistic locking version check';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE <> 'P1120' THEN RAISE EXCEPTION 'FAIL: Expected P1120, got % (%)', SQLSTATE, SQLERRM; END IF;
        RAISE NOTICE 'PASS: Optimistic locking enforced.';
    END;

    RAISE NOTICE 'L1 Concurrency & Outbox Tests Completed Successfully.';
END $$;
