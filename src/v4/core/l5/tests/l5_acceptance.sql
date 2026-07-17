-- MJRH V4 — Layer 5 Acceptance Test
-- Scenario: Verification of Immutability and Chain Integrity.

BEGIN;

-- 1. Generate Operational Facts in L4 (Simulated)
SET LOCAL app.current_sovereign_label = '_root';

-- 2. Observe Automatic Ingestion into L5
-- (Trigger trg_l4_fact_capture will execute)
INSERT INTO v4_l4.outbox_facts (work_order_id, node_id, actor_id, fact_type, payload)
VALUES (
    gen_random_uuid(), 
    (SELECT id FROM v4_l1.nodes WHERE node_path = '_root' LIMIT 1),
    (SELECT id FROM v4_l2.actors LIMIT 1),
    'WO_CREATED',
    '{"test": "fact_1"}'
);

-- 3. Verify Ledger Persistence
SELECT COUNT(*) FROM v4_l5.evidence_ledger WHERE fact_payload->>'test' = 'fact_1';

-- 4. Test Immutability (Must FAIL)
DO $$
BEGIN
    BEGIN
        UPDATE v4_l5.evidence_ledger SET fact_type = 'TAMPERED' WHERE id = 1;
        RAISE EXCEPTION 'TEST_FAILED: Immutability not enforced';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = 'P4001' THEN
            RAISE NOTICE 'SUCCESS: Update blocked by immutability guard.';
        ELSE
            RAISE;
        END IF;
    END;
END $$;

-- 5. Verify Chain Integrity
SELECT * FROM v4_l5.fn_v_verify_chain_integrity((SELECT id FROM v4_l1.nodes WHERE node_path = '_root' LIMIT 1));

ROLLBACK;
