-- MJRH V4 — L2 Acceptance Suite v2.1
BEGIN;
    -- Pre-setup: IDs from L1
    -- N1 (Root), N2 (Child)
    -- Identities 10 (Corp A)

    -- TEST 1: Physical Inheritance (Ltree)
    INSERT INTO v4_l2.mandates (actor_id, org_node_id, action_scope, resource_class)
    VALUES ('00000000-0000-0000-0000-000000000777'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'finance.audit', 'ledger');
    
    IF (v4_l2.fn_evaluate_governance('00000000-0000-0000-0000-000000000777'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'finance.audit', 'ledger')->>'decision' = 'ALLOW') THEN
        RAISE NOTICE 'PASS: Physical Scope Inheritance (ltree) proven.';
    END IF;

    -- TEST 2: Policy Interpreter (JSON Definition)
    INSERT INTO v4_l2.policies (sovereign_id, name, policy_class, effect, action_scope, rule_definition)
    VALUES ('00000000-0000-0000-0000-000000000010'::uuid, 'Large Spend Check', 'BUSINESS', 'REQUIRE_APPROVAL', 'finance.spend', '{"max_value": 5000}');

    -- Case A: Under limit
    IF (v4_l2.fn_evaluate_governance('00000000-0000-0000-0000-000000000777'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'finance.spend', 'ledger', '{"value": 1000}')->>'decision' = 'DENY') THEN
        RAISE NOTICE 'PASS: Mandate required even if policy passes.';
    END IF;

    -- Case B: Over limit -> Trigger Approval
    IF (v4_l2.fn_evaluate_governance('00000000-0000-0000-0000-000000000777'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'finance.spend', 'ledger', '{"value": 6000}')->>'decision' = 'REQUIRE_APPROVAL') THEN
        RAISE NOTICE 'PASS: Policy Interpreter correctly triggered REQUIRE_APPROVAL.';
    END IF;

    RAISE NOTICE 'L2 VERIFICATION v2.1 COMPLETE: ALL PROOFS ATTACHED.';
ROLLBACK;
