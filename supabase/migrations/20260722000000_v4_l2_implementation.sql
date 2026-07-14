-- MJRH V4 — Layer 2: Governance & Policy (Final Frozen Implementation v2.1)
CREATE SCHEMA IF NOT EXISTS v4_l2;

-- [TABLE] Policy Registry
CREATE TABLE v4_l2.policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sovereign_id uuid NOT NULL, 
    name text NOT NULL,
    policy_class text NOT NULL CHECK (policy_class IN ('LEGAL', 'BUSINESS')),
    effect text NOT NULL CHECK (effect IN ('ALLOW', 'DENY', 'REQUIRE_APPROVAL', 'REQUIRE_ESCALATION')),
    action_scope text NOT NULL, -- e.g., 'finance.*'
    rule_definition jsonb NOT NULL DEFAULT '{}'::jsonb, -- { "resource_limit": 1000, "allowed_types": [...] }
    priority int DEFAULT 100,
    is_active boolean DEFAULT true,
    valid_from timestamptz NOT NULL DEFAULT now(),
    valid_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- [TABLE] Mandates
CREATE TABLE v4_l2.mandates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL,
    org_node_id uuid NOT NULL, 
    action_scope text NOT NULL,
    resource_class text NOT NULL,
    valid_from timestamptz NOT NULL DEFAULT now(),
    valid_until timestamptz,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- [HELPER] Policy Interpreter
CREATE OR REPLACE FUNCTION v4_l2.fn_interpret_policy(_definition jsonb, _context jsonb)
RETURNS boolean AS $$
BEGIN
    -- This is the actual interpreter logic
    -- Example: Check if the action value exceeds a limit defined in the policy
    IF (_definition ? 'max_value') AND ((_context->>'value')::numeric > (_definition->>'max_value')::numeric) THEN
        RETURN FALSE;
    END IF;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- [ENGINE] Governance Decision Engine
CREATE OR REPLACE FUNCTION v4_l2.fn_evaluate_governance(
    _actor_id uuid,
    _target_node_id uuid,
    _action text,
    _resource_class text,
    _context jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb AS $$
DECLARE
    _target_path ltree;
    _sovereign_id uuid;
    _policy record;
    _mandate_id uuid;
BEGIN
    -- 1. Structural Resolution (L1 Dependency)
    SELECT node_path INTO _target_path FROM v4_l1.nodes WHERE id = _target_node_id;
    IF _target_path IS NULL THEN RETURN jsonb_build_object('decision', 'DENY', 'reason', 'STRUCTURAL_ORPHAN'); END IF;
    SELECT (v4_l1.resolve_sovereign_root(_target_node_id)->>'sovereign_id')::uuid INTO _sovereign_id;

    -- STEP 1: EXPLICIT DENY (Precedence 1)
    SELECT id INTO _policy FROM v4_l2.policies
    WHERE sovereign_id = _sovereign_id AND is_active = true AND effect = 'DENY'
    AND (_action LIKE action_scope OR action_scope = '*')
    AND valid_from <= now() AND (valid_until IS NULL OR valid_until > now())
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object('decision', 'DENY', 'reason', 'EXPLICIT_POLICY_DENY', 'policy_id', _policy.id);
    END IF;

    -- STEP 2: LEGAL & BUSINESS CONSTRAINTS (Precedence 2)
    -- This evaluates if we need Approval or Escalation before checking Mandates
    FOR _policy IN 
        SELECT * FROM v4_l2.policies
        WHERE sovereign_id = _sovereign_id AND is_active = true 
        AND effect IN ('REQUIRE_APPROVAL', 'REQUIRE_ESCALATION')
        AND (_action LIKE action_scope OR action_scope = '*')
        AND valid_from <= now() AND (valid_until IS NULL OR valid_until > now())
        ORDER BY (CASE WHEN policy_class = 'LEGAL' THEN 0 ELSE 1 END), priority ASC
    LOOP
        -- Execute Interpreter
        IF NOT v4_l2.fn_interpret_policy(_policy.rule_definition, _context) THEN
            RETURN jsonb_build_object('decision', _policy.effect, 'reason', 'POLICY_CONSTRAINT_TRIGGERED', 'policy_id', _policy.id);
        END IF;
    END LOOP;

    -- STEP 3: MANDATE VERIFICATION (Precedence 3)
    -- Inheritance: Check if actor has mandate on node or ANY ancestor
    SELECT m.id INTO _mandate_id
    FROM v4_l2.mandates m
    JOIN v4_l1.nodes n ON m.org_node_id = n.id
    WHERE m.actor_id = _actor_id
    AND n.node_path @> _target_path -- Physical Inheritance Proof
    AND (m.action_scope = _action OR m.action_scope = '*')
    AND m.resource_class = _resource_class
    AND m.revoked_at IS NULL
    AND m.valid_from <= now() AND (valid_until IS NULL OR valid_until > now())
    LIMIT 1;

    IF _mandate_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'decision', 'ALLOW', 
            'reason', 'MANDATE_GRANTED',
            'metadata', jsonb_build_object(
                'mandate_id', _mandate_id,
                'sovereign_id', _sovereign_id,
                'eval_at', now()
            )
        );
    END IF;

    -- STEP 4: DEFAULT DENY (Final fallback)
    RETURN jsonb_build_object('decision', 'DENY', 'reason', 'DEFAULT_DENY_NO_MANDATE');
END;
$$ LANGUAGE plpgsql STABLE;
