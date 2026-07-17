-- MJRH V4 — FULL STACK TEST: Provisioning Simulation
-- Protocol: S0-S2 Compliant (Sovereign Context Enforced)

BEGIN;

-- 1. [L1] SET SOVEREIGN CONTEXT
-- We must set the label to match the root path we are working in.
-- For this test, we will create a new root called 'test_holding'.
SET LOCAL app.current_sovereign_label = 'test_holding';

-- 2. [L1] BOOTSTRAP NEW HOLDING (Using RPC added in 014)
-- This creates the Identity and the Sovereign Node atomically.
DO $$
DECLARE
    _root_id uuid;
    _stream_id uuid;
    _activity_id uuid;
    _job_id uuid;
BEGIN
    -- Bootstrap the root
    _root_id := v4_l1.bootstrap_holding(
        gen_random_uuid(), -- Owner Identity ID
        'Test Holding Group',
        'urn:mjrh:test_holding'
    );
    
    RAISE NOTICE 'SUCCESS: Sovereign Root Created with ID: %', _root_id;

    -- 3. [L4] SETUP VALUE STREAM (Blueprint)
    -- NOTE: Currently no RPC exists for Blueprinting; using direct insert for Setup phase.
    INSERT INTO v4_l4.value_streams (id, sovereign_root_id, name)
    VALUES (gen_random_uuid(), _root_id, 'Test Laundry Stream')
    RETURNING id INTO _stream_id;

    INSERT INTO v4_l4.activities (id, stream_id, name, sequence_order, mandate_required)
    VALUES (gen_random_uuid(), _stream_id, 'Receive Clothes', 1, 'OPERATIONAL_ENTRY')
    RETURNING id INTO _activity_id;

    RAISE NOTICE 'SUCCESS: Value Stream [%] and Activity [%] Created.', _stream_id, _activity_id;

    -- 4. [L4] PROVISION JOB (Using Official RPC)
    -- This verifies that L4 can anchor a job to the new L1 structure.
    -- We assume the CEO actor from previous simulations exists or we map to a system actor.
    -- For this logic check, we use the bootstrap owner.
    
    _job_id := v4_l4.rpc_provision_job(
        _node_id => _root_id,
        _stream_id => _stream_id,
        _payload => '{"customer": "Ahmed", "items": 5}'::jsonb
    );

    RAISE NOTICE 'SUCCESS: Work Order Provisioned via RPC. ID: %', _job_id;

    -- 5. VERIFY INTEGRITY (L5)
    IF EXISTS (SELECT 1 FROM v4_l5.evidence_ledger WHERE work_order_id = _job_id) THEN
        RAISE NOTICE 'SUCCESS: Evidence captured in L5 Ledger.';
    ELSE
        RAISE EXCEPTION 'FAILURE: Evidence Ledger missed the pulse.';
    END IF;

END $$;

ROLLBACK; -- Standard protocol: Verification only, no state pollution.
