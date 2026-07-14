-- MJRH V4 — L2 Core Acceptance v2.0
BEGIN;
    -- Assume L1 nodes exist: N1 (Root), N2 (Child)
    -- Identities 10 (Corp A), 20 (Dept B)

    -- 1. Test Scope Inheritance
    -- Give actor mandate on Root (N1), should ALLOW on Child (N2)
    INSERT INTO v4_l2.mandates (actor_id, org_node_id, action_scope, resource_class)
    VALUES ('00000000-0000-0000-0000-000000000555'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ops.execute', 'task');
    
    IF (v4_l2.fn_evaluate_governance('00000000-0000-0000-0000-000000000555'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'ops.execute', 'task')->>'decision' = 'ALLOW') THEN
        RAISE NOTICE 'PASS: Scope Inheritance verified.';
    END IF;

    -- 2. Test Explicit Deny over Mandate
    -- Add a policy that denies 'ops.execute' at the sovereign level
    INSERT INTO v4_l2.policies (sovereign_id, name, policy_class, effect, action_scope)
    VALUES ('00000000-0000-0000-0000-000000000010'::uuid, 'Global Lock', 'LEGAL', 'DENY', 'ops.execute');
    
    IF (v4_l2.fn_evaluate_governance('00000000-0000-0000-0000-000000000555'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'ops.execute', 'task')->>'decision' = 'DENY') THEN
        RAISE NOTICE 'PASS: Explicit Deny precedence verified.';
    END IF;

    -- 3. Test Require Approval state
    INSERT INTO v4_l2.policies (sovereign_id, name, policy_class, effect, action_scope, priority)
    VALUES ('00000000-0000-0000-0000-000000000010'::uuid, 'High Value Check', 'BUSINESS', 'REQUIRE_APPROVAL', 'finance.spend', 50);

    IF (v4_l2.fn_evaluate_governance('00000000-0000-0000-0000-000000000555'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'finance.spend', 'ledger')->>'decision' = 'REQUIRE_APPROVAL') THEN
        RAISE NOTICE 'PASS: Require Approval outcome verified.';
    END IF;

    RAISE NOTICE 'L2 VERIFICATION v2.0 COMPLETE.';
ROLLBACK;
