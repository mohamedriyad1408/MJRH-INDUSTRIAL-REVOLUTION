-- MJRH V4 — Layer 1: THE FROZEN CORE CANDIDATE (v2.3)
-- Unified Code Package for Final Review

CREATE SCHEMA IF NOT EXISTS v4_l1;
CREATE EXTENSION IF NOT EXISTS ltree;

-- [COMP: Identity Registry]
CREATE TABLE v4_l1.identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    global_urn text UNIQUE NOT NULL,
    is_sovereign_root boolean DEFAULT false,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- [COMP: Topology Engine]
CREATE TABLE v4_l1.nodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id uuid NOT NULL REFERENCES v4_l1.identities(id),
    parent_id uuid REFERENCES v4_l1.nodes(id),
    node_class text NOT NULL CHECK (node_class IN ('SOVEREIGN_ROOT', 'INTERNAL_NODE')),
    lifecycle_status text NOT NULL DEFAULT 'DRAFT' CHECK (lifecycle_status IN ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    node_path ltree,
    UNIQUE(id, identity_id) -- Identity constraint helper
);

CREATE INDEX idx_nodes_path_gist ON v4_l1.nodes USING gist(node_path);

-- [LOGIC: Path Calculation]
CREATE OR REPLACE FUNCTION v4_l1.fn_compute_path(_node_id uuid, _parent_id uuid) RETURNS ltree AS $$
DECLARE
    _p_path ltree;
    _label label := ('_' || replace(_node_id::text, '-', ''))::label;
BEGIN
    IF _parent_id IS NULL THEN RETURN _label::ltree; END IF;
    SELECT node_path FROM v4_l1.nodes WHERE id = _parent_id INTO _p_path;
    RETURN _p_path || _label;
END;
$$ LANGUAGE plpgsql STABLE;

-- [LOGIC: Invariant Validation]
CREATE OR REPLACE FUNCTION v4_l1.fn_assert_invariants(_new v4_l1.nodes, _old v4_l1.nodes DEFAULT NULL) RETURNS void AS $$
DECLARE
    _is_sov boolean;
BEGIN
    -- 1. Sovereign Root Invariant
    IF _new.parent_id IS NULL THEN
        SELECT is_sovereign_root INTO _is_sov FROM v4_l1.identities WHERE id = _new.identity_id;
        IF NOT _is_sov THEN RAISE EXCEPTION 'NON_SOVEREIGN_ROOT'; END IF;
    END IF;

    -- 2. Identity Recursion Invariant (1:N Disjoint Branch Rule)
    IF EXISTS (
        SELECT 1 FROM v4_l1.nodes 
        WHERE identity_id = _new.identity_id AND id <> _new.id
        AND (node_path @> _new.node_path OR node_path <@ _new.node_path)
    ) THEN
        RAISE EXCEPTION 'IDENTITY_PATH_RECURSION';
    END IF;

    -- 3. Cycle Detection
    IF _old IS NOT NULL AND _new.parent_id IS DISTINCT FROM _old.parent_id THEN
        IF _old.node_path @> (SELECT node_path FROM v4_l1.nodes WHERE id = _new.parent_id) THEN
            RAISE EXCEPTION 'CIRCULAR_DEPENDENCY';
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- [ORCHESTRATION: Trigger]
CREATE OR REPLACE FUNCTION v4_l1.trg_l1_core_orchestrator() RETURNS trigger AS $$
BEGIN
    NEW.node_path := v4_l1.fn_compute_path(NEW.id, NEW.parent_id);
    PERFORM v4_l1.fn_assert_invariants(NEW, CASE WHEN TG_OP = 'UPDATE' THEN OLD ELSE NULL END);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l1_freeze_guard BEFORE INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_l1_core_orchestrator();
