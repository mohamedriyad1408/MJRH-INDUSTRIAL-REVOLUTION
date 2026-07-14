-- MJRH V4 — L2 Acceptance Suite v1.0
DO $$
DECLARE
    _node_id uuid := '00000000-0000-0000-0000-000000000001'; -- Assumed from L1 setup
    _actor_id uuid := gen_random_uuid();
    _res jsonb;
BEGIN
    RAISE NOTICE 'Starting L2 Acceptance Suite...';

    -- Note: This suite assumes L1 Frozen Core is active in DB.
    
    -- 1. Test Default Deny
    _res := v4_l2.fn_evaluate_governance(_actor_id, _node_id, 'finance.read', 'ledger');
    IF (_res->>'decision' = 'DENY') THEN RAISE NOTICE 'PASS: Default Deny enforced.'; END IF;

    -- 2. Test Mandate Granting
    INSERT INTO v4_l2.mandates (actor_id, org_node_id, action_scope, resource_class)
    VALUES (_actor_id, _node_id, 'finance.read', 'ledger');
    
    _res := v4_l2.fn_evaluate_governance(_actor_id, _node_id, 'finance.read', 'ledger');
    IF (_res->>'decision' = 'ALLOW') THEN RAISE NOTICE 'PASS: Mandate Granting verified.'; END IF;

    -- 3. Test Revocation
    UPDATE v4_l2.mandates SET revoked_at = now() WHERE actor_id = _actor_id;
    _res := v4_l2.fn_evaluate_governance(_actor_id, _node_id, 'finance.read', 'ledger');
    IF (_res->>'decision' = 'DENY') THEN RAISE NOTICE 'PASS: Revocation verified.'; END IF;

    RAISE NOTICE 'L2 VERIFICATION COMPLETE.';
END $$;
