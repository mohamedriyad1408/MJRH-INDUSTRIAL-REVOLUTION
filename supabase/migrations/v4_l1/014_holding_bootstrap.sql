-- MJRH V4 — Layer 1: HOLDING BOOTSTRAP (v1.0)
-- Purpose: Provision a new Sovereign Root and its corresponding Identity.

CREATE OR REPLACE FUNCTION v4_l1.bootstrap_holding(
    _owner_identity_id uuid,
    _legal_name text,
    _global_urn text
) RETURNS uuid
SECURITY DEFINER
SET search_path = v4_l1, public
AS $$
DECLARE
    _new_identity_id uuid;
    _node_id uuid;
BEGIN
    -- 1. Create Identity (The Legal Presence)
    INSERT INTO v4_l1.identities (global_urn, legal_name, is_sovereign_root, sovereign_owner_id)
    VALUES (lower(_global_urn), _legal_name, true, _owner_identity_id)
    RETURNING id INTO _new_identity_id;

    -- 2. Create Sovereign Root Node (The Structural Anchor)
    -- Node path will be initialized by the trigger trg_l1_orchestrator
    INSERT INTO v4_l1.nodes (identity_id, node_class, current_state)
    VALUES (_new_identity_id, 'SOVEREIGN_ROOT', 'ACTIVE')
    RETURNING id INTO _node_id;

    -- 3. Emit Genesis Event (Outbox for cross-layer sync)
    INSERT INTO v4_l1.structural_outbox (event_type, aggregate_id, payload)
    VALUES ('HoldingBootstrapped', _node_id, jsonb_build_object('owner', _owner_identity_id, 'timestamp', now()));

    RETURN _node_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION v4_l1.bootstrap_holding TO authenticated;
