-- MJRH V4 — Layer 2: DELEGATION EXTENSION (v1.1)
-- Allows an Actor to explicitly delegate their mandate to another Actor.

CREATE TABLE IF NOT EXISTS v4_l2.delegations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sovereign_root_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    delegator_actor_id uuid NOT NULL REFERENCES v4_l2.actors(id), -- الأصيل
    delegatee_actor_id uuid NOT NULL REFERENCES v4_l2.actors(id), -- الوكيل
    authority_class text NOT NULL, -- ما الذي تم تفويضه؟
    effective_range tstzrange NOT NULL, -- الفترة الزمنية
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- [ENGINE] Check Effective Mandate
-- Checks if an actor has authority directly OR via delegation.
CREATE OR REPLACE FUNCTION v4_l2.fn_v_has_effective_mandate(
    _actor_id uuid,
    _required_class text,
    _at_node_id uuid
) RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        -- 1. Direct Mandate
        SELECT 1 FROM v4_l2.assignments a
        JOIN v4_l2.positions p ON a.position_id = p.id
        JOIN v4_l2.authorities auth ON a.id = auth.assignment_id
        WHERE a.actor_id = _actor_id 
        AND p.node_id = _at_node_id
        AND a.lifecycle_status = 'ACTIVE'
        AND auth.authority_class = _required_class
        AND auth.is_active = true
    ) OR EXISTS (
        -- 2. Delegated Mandate
        SELECT 1 FROM v4_l2.delegations d
        WHERE d.delegatee_actor_id = _actor_id
        AND d.authority_class = _required_class
        AND d.effective_range @> now()
        AND d.is_active = true
    );
END;
$$ LANGUAGE plpgsql STABLE;
