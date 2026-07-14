-- MJRH V4 — Layer 2: Governance & Policy (Final Implementation v2.0)
CREATE SCHEMA IF NOT EXISTS v4_l2;

-- [TABLE] Policy Registry
CREATE TABLE v4_l2.policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sovereign_id uuid NOT NULL, -- Logical link to L1
    name text NOT NULL,
    policy_class text NOT NULL CHECK (policy_class IN ('LEGAL', 'BUSINESS')),
    effect text NOT NULL CHECK (effect IN ('ALLOW', 'DENY', 'REQUIRE_APPROVAL', 'REQUIRE_ESCALATION')),
    action_scope text NOT NULL, -- e.g., 'finance.*'
    priority int DEFAULT 100,
    is_active boolean DEFAULT true,
    valid_from timestamptz NOT NULL DEFAULT now(),
    valid_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- [TABLE] Mandates (Administrative Delegation)
CREATE TABLE v4_l2.mandates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL,
    org_node_id uuid NOT NULL, -- Anchor to L1 Node
    action_scope text NOT NULL,
    resource_class text NOT NULL,
    valid_from timestamptz NOT NULL DEFAULT now(),
    valid_until timestamptz,
    revoked_at timestamptz,
    revoked_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- [ENGINE] Governance Decision Engine (The Intelligence)
CREATE OR REPLACE FUNCTION v4_l2.fn_evaluate_governance(
    _actor_id uuid,
    _target_node_id uuid,
    _action text,
    _resource_class text
) RETURNS jsonb AS $$
DECLARE
    _target_path ltree;
    _sovereign_id uuid;
    _matched_policy_id uuid;
    _matched_mandate_id uuid;
    _final_decision text := 'DENY';
    _reason text := 'DEFAULT_DENY';
BEGIN
    -- 1. Resolve Target Path and Sovereign from L1
    SELECT node_path INTO _target_path FROM v4_l1.nodes WHERE id = _target_node_id;
    IF _target_path IS NULL THEN RETURN jsonb_build_object('decision', 'DENY', 'reason', 'NODE_NOT_FOUND'); END IF;
    
    SELECT (v4_l1.resolve_sovereign_root(_target_node_id)->>'sovereign_id')::uuid INTO _sovereign_id;

    -- 2. PRIORITY 1: Explicit Deny (Policies on ancestry path)
    SELECT id INTO _matched_policy_id FROM v4_l2.policies
    WHERE sovereign_id = _sovereign_id 
    AND is_active = true
    AND effect = 'DENY'
    AND (_action LIKE action_scope OR action_scope = '*')
    AND valid_from <= now() AND (valid_until IS NULL OR valid_until > now())
    LIMIT 1;

    IF _matched_policy_id IS NOT NULL THEN
        RETURN jsonb_build_object('decision', 'DENY', 'reason', 'EXPLICIT_POLICY_DENY', 'matched_policy_id', _matched_policy_id);
    END IF;

    -- 3. PRIORITY 2: Legal/Business Policy Evaluation (Approvals/Escalations)
    SELECT id, effect INTO _matched_policy_id, _final_decision FROM v4_l2.policies
    WHERE sovereign_id = _sovereign_id 
    AND is_active = true
    AND effect IN ('REQUIRE_APPROVAL', 'REQUIRE_ESCALATION')
    AND (_action LIKE action_scope OR action_scope = '*')
    AND valid_from <= now() AND (valid_until IS NULL OR valid_until > now())
    ORDER BY (CASE WHEN policy_class = 'LEGAL' THEN 0 ELSE 1 END), priority ASC
    LIMIT 1;

    IF _matched_policy_id IS NOT NULL THEN
        RETURN jsonb_build_object('decision', _final_decision, 'reason', 'POLICY_RESTRICTION', 'matched_policy_id', _matched_policy_id);
    END IF;

    -- 4. PRIORITY 3: Mandate Check (With Scope Inheritance)
    -- If actor has mandate on target node or ANY ancestor, access is granted.
    SELECT m.id INTO _matched_mandate_id
    FROM v4_l2.mandates m
    JOIN v4_l1.nodes n ON m.org_node_id = n.id
    WHERE m.actor_id = _actor_id
    AND n.node_path @> _target_path -- Inheritance: Mandate node is ancestor of target
    AND (m.action_scope = _action OR m.action_scope = '*')
    AND m.resource_class = _resource_class
    AND m.revoked_at IS NULL
    AND m.valid_from <= now() AND (m.valid_until IS NULL OR m.valid_until > now())
    LIMIT 1;

    IF _matched_mandate_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'decision', 'ALLOW', 
            'reason', 'MANDATE_GRANTED', 
            'matched_mandate_id', _matched_mandate_id,
            'sovereign_id', _sovereign_id,
            'eval_at', now()
        );
    END IF;

    -- 5. Final Fallback
    RETURN jsonb_build_object('decision', 'DENY', 'reason', 'NO_MANDATE_OR_POLICY_MATCHED');
END;
$$ LANGUAGE plpgsql STABLE;
