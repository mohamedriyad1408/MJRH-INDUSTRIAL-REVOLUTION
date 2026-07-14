-- MJRH V4 — Layer 2: Governance & Policy (v1.0 Implementation)
CREATE SCHEMA IF NOT EXISTS v4_l2;

-- [TABLE] Policy Sets (Grouping Mechanism)
CREATE TABLE v4_l2.policy_sets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sovereign_id uuid NOT NULL, -- Logical link to L1 Identity
    name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- [TABLE] Declarative Policies
CREATE TABLE v4_l2.policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_set_id uuid REFERENCES v4_l2.policy_sets(id),
    name text NOT NULL,
    rule_definition jsonb NOT NULL, -- {condition, operator, target, effect: 'ALLOW'|'DENY'}
    priority int DEFAULT 100,
    version int DEFAULT 1,
    valid_from timestamptz NOT NULL DEFAULT now(),
    valid_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- [TABLE] Mandates (Administrative Delegation)
CREATE TABLE v4_l2.mandates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL, -- Foreign key to Actor Registry (Logical)
    org_node_id uuid NOT NULL, -- Anchor to L1 Node
    action_scope text NOT NULL, -- e.g., 'finance.read', 'ops.execute'
    resource_class text NOT NULL,
    valid_from timestamptz NOT NULL DEFAULT now(),
    valid_until timestamptz,
    revoked_at timestamptz,
    revoked_by uuid,
    version int DEFAULT 1,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- [ENGINE] Decision Logic (The RPC)
CREATE OR REPLACE FUNCTION v4_l2.fn_evaluate_governance(
    _actor_id uuid,
    _target_node_id uuid,
    _action text,
    _resource_class text
) RETURNS jsonb AS $$
DECLARE
    _has_mandate boolean;
    _explicit_deny boolean;
    _matching_policy record;
    _sovereign_id uuid;
BEGIN
    -- 1. Resolve Sovereign Boundary from L1
    SELECT (v4_l1.resolve_sovereign_root(_target_node_id)->>'sovereign_id')::uuid INTO _sovereign_id;
    IF _sovereign_id IS NULL THEN 
        RETURN jsonb_build_object('decision', 'DENY', 'reason', 'UNRESOLVED_BOUNDARY');
    END IF;

    -- 2. Check for Explicit Deny Policies (Highest Precedence)
    SELECT EXISTS (
        SELECT 1 FROM v4_l2.policies p
        JOIN v4_l2.policy_sets s ON p.policy_set_id = s.id
        WHERE s.sovereign_id = _sovereign_id 
        AND p.rule_definition->>'effect' = 'DENY'
        AND p.valid_from <= now() AND (p.valid_until IS NULL OR p.valid_until > now())
    ) INTO _explicit_deny;

    IF _explicit_deny THEN
        RETURN jsonb_build_object('decision', 'DENY', 'reason', 'EXPLICIT_POLICY_DENY');
    END IF;

    -- 3. Check for Active Mandate
    SELECT EXISTS (
        SELECT 1 FROM v4_l2.mandates
        WHERE actor_id = _actor_id 
        AND org_node_id = _target_node_id
        AND action_scope = _action
        AND resource_class = _resource_class
        AND revoked_at IS NULL
        AND valid_from <= now() AND (valid_until IS NULL OR valid_until > now())
    ) INTO _has_mandate;

    IF _has_mandate THEN
        RETURN jsonb_build_object('decision', 'ALLOW', 'reason', 'MANDATE_GRANTED');
    END IF;

    -- 4. Default Deny
    RETURN jsonb_build_object('decision', 'DENY', 'reason', 'NO_MANDATE_OR_POLICY');
END;
$$ LANGUAGE plpgsql STABLE;
