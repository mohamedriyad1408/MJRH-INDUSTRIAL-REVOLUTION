-- MJRH V4 — Layer 1: Persistence Layer (Refactored)
-- Specification Version: 2.2

CREATE SCHEMA IF NOT EXISTS v4_l1;
CREATE EXTENSION IF NOT EXISTS ltree;

-- 1. Identity Registry
CREATE TABLE IF NOT EXISTS v4_l1.identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    global_urn text UNIQUE NOT NULL,
    is_sovereign_root boolean DEFAULT false,
    status text NOT NULL DEFAULT 'active'
);

-- 2. Topology Nodes
CREATE TABLE IF NOT EXISTS v4_l1.nodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id uuid NOT NULL REFERENCES v4_l1.identities(id),
    parent_id uuid REFERENCES v4_l1.nodes(id),
    node_class text NOT NULL CHECK (node_class IN ('SOVEREIGN_ROOT', 'INTERNAL_NODE')),
    lifecycle_status text NOT NULL DEFAULT 'DRAFT' CHECK (lifecycle_status IN ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    node_path ltree,
    
    -- Invariant: Identity cannot be its own parent
    CONSTRAINT no_identity_recursion CHECK (true) -- Enforced by Trigger for depth
);

-- ============================================================================
-- ATOMIC INTEGRITY FUNCTIONS
-- ============================================================================

-- A. Path Calculation
CREATE OR REPLACE FUNCTION v4_l1.fn_calculate_path(_id uuid, _parent_id uuid) RETURNS ltree AS $$
DECLARE
    _parent_path ltree;
    _current_label label := ('_' || replace(_id::text, '-', ''))::label;
BEGIN
    IF _parent_id IS NULL THEN
        RETURN _current_label::ltree;
    ELSE
        SELECT node_path FROM v4_l1.nodes WHERE id = _parent_id INTO _parent_path;
        RETURN _parent_path || _current_label;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- B. Validation (Invariants)
CREATE OR REPLACE FUNCTION v4_l1.fn_validate_node(_node v4_l1.nodes) RETURNS void AS $$
DECLARE
    _is_sovereign boolean;
    _existing_path ltree;
BEGIN
    -- Root Sovereignty check
    IF _node.parent_id IS NULL THEN
        SELECT is_sovereign_root INTO _is_sovereign FROM v4_l1.identities WHERE id = _node.identity_id;
        IF NOT _is_sovereign THEN RAISE EXCEPTION 'Non-Sovereign Identity cannot be Root.'; END IF;
    END IF;

    -- Identity Ancestry Violation (1:N Constraint)
    IF EXISTS (
        SELECT 1 FROM v4_l1.nodes 
        WHERE identity_id = _node.identity_id 
        AND (_node.node_path <@ node_path OR _node.node_path @> node_path)
        AND id <> _node.id
    ) THEN
        RAISE EXCEPTION 'Identity Violation: This identity already exists in this ancestry path.';
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- C. Trigger orchestrator
CREATE OR REPLACE FUNCTION v4_l1.trg_node_orchestrator() RETURNS trigger AS $$
BEGIN
    -- 1. Calculate Path
    NEW.node_path := v4_l1.fn_calculate_path(NEW.id, NEW.parent_id);
    
    -- 2. Validate Invariants
    PERFORM v4_l1.fn_validate_node(NEW);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l1_node_integrity BEFORE INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_node_orchestrator();
