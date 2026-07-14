-- MJRH V4 — Layer 2: Governance Implementation (Hardened)
CREATE SCHEMA IF NOT EXISTS v4_l2;

-- [TABLE] Policies
CREATE TABLE v4_l2.policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sovereign_id uuid NOT NULL,
    name text NOT NULL,
    policy_class text NOT NULL CHECK (policy_class IN ('LEGAL', 'BUSINESS')),
    effect text NOT NULL CHECK (effect IN ('ALLOW', 'DENY', 'REQUIRE_APPROVAL')),
    action_scope text NOT NULL,
    rule_definition jsonb NOT NULL,
    priority int DEFAULT 100,
    version int DEFAULT 1,
    valid_from timestamptz NOT NULL DEFAULT now(),
    valid_until timestamptz
);

-- [ENGINE] Decision Engine with Precedence Logic
CREATE OR REPLACE FUNCTION v4_l2.fn_evaluate_governance(
    _actor_id uuid,
    _target_node_id uuid,
    _action text,
    _context jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb AS $$
DECLARE
    _explicit_deny boolean;
    _sovereign_id uuid;
BEGIN
    -- Resolve Sovereignty via L1 RPC
    SELECT (v4_l1.resolve_sovereign_root(_target_node_id)->>'sovereign_id')::uuid INTO _sovereign_id;

    -- 1. Resolve Conflict: Explicit Deny Check
    SELECT EXISTS (
        SELECT 1 FROM v4_l2.policies 
        WHERE sovereign_id = _sovereign_id AND effect = 'DENY'
        AND (_action LIKE action_scope OR action_scope = '*')
        AND valid_from <= now() AND (valid_until IS NULL OR valid_until > now())
    ) INTO _explicit_deny;

    IF _explicit_deny THEN RETURN jsonb_build_object('decision', 'DENY', 'reason', 'POLICY_EXPLICIT_DENY'); END IF;

    -- 2. Temporal Version Matching Logic would go here in full implementation...
    RETURN jsonb_build_object('decision', 'ALLOW', 'reason', 'DEFAULT_MANDATE_EVAL_PENDING');
END;
$$ LANGUAGE plpgsql STABLE;
