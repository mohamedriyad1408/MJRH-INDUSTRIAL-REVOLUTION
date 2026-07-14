-- MJRH V4 — Layer 1: THE FROZEN CORE (v2.7 - DEFINITIVE)
-- Standard: Enterprise Institutional OS
CREATE SCHEMA IF NOT EXISTS v4_l1;
CREATE EXTENSION IF NOT EXISTS ltree;

-- [TABLE] Identity Registry
CREATE TABLE v4_l1.identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    global_urn text UNIQUE NOT NULL,
    legal_name text NOT NULL,
    is_sovereign_root boolean DEFAULT false,
    lifecycle_status text NOT NULL DEFAULT 'active' CHECK (lifecycle_status IN ('active', 'archived')),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- [TABLE] Topology Nodes
CREATE TABLE v4_l1.nodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id uuid NOT NULL REFERENCES v4_l1.identities(id),
    parent_id uuid REFERENCES v4_l1.nodes(id) ON DELETE RESTRICT,
    node_class text NOT NULL CHECK (node_class IN ('SOVEREIGN_ROOT', 'INTERNAL_NODE')),
    lifecycle_status text NOT NULL DEFAULT 'ACTIVE' CHECK (lifecycle_status IN ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    node_path ltree NOT NULL, -- Managed by trigger
    version bigint NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT no_self_parent CHECK (id <> parent_id)
);

CREATE INDEX idx_nodes_path_gist ON v4_l1.nodes USING gist(node_path);

-- [RPC: Resolve Sovereign Root]
CREATE OR REPLACE FUNCTION v4_l1.resolve_sovereign_root(target_node_id uuid)
RETURNS jsonb AS $$
DECLARE
    _path ltree;
    _root_node_id uuid;
    _sovereign_identity_id uuid;
BEGIN
    SELECT node_path INTO _path FROM v4_l1.nodes WHERE id = target_node_id;
    IF _path IS NULL THEN RETURN NULL; END IF;
    _root_node_id := (replace(subltree(_path, 0, 1)::text, '_', ''))::uuid;
    SELECT identity_id INTO _sovereign_identity_id FROM v4_l1.nodes WHERE id = _root_node_id;
    RETURN jsonb_build_object('sovereign_id', _sovereign_identity_id, 'path', _path::text);
END;
$$ LANGUAGE plpgsql STABLE;

-- [LOGIC: Invariants]
CREATE OR REPLACE FUNCTION v4_l1.fn_assert_l1_invariants(_new v4_l1.nodes, _old v4_l1.nodes DEFAULT NULL) RETURNS void AS $$
DECLARE
    _is_sov boolean;
BEGIN
    -- 1. Sovereign Root Requirement
    IF _new.parent_id IS NULL THEN
        SELECT is_sovereign_root INTO _is_sov FROM v4_l1.identities WHERE id = _new.identity_id;
        IF NOT _is_sov THEN RAISE EXCEPTION 'ASSERT_FAIL: Non-Sovereign Identity cannot be Root.'; END IF;
    END IF;

    -- 2. Cycle Detection
    IF _old IS NOT NULL AND _new.parent_id IS DISTINCT FROM _old.parent_id THEN
        IF _old.node_path @> (SELECT node_path FROM v4_l1.nodes WHERE id = _new.parent_id) THEN
            RAISE EXCEPTION 'ASSERT_FAIL: Circular dependency detected.';
        END IF;
    END IF;

    -- 3. Identity Path Uniqueness (Disjoint Branch Rule)
    IF EXISTS (
        SELECT 1 FROM v4_l1.nodes n
        WHERE n.id IN (SELECT (replace(label, '_', ''))::uuid FROM unnest(ltree2text_array(_new.node_path)) AS label)
        AND n.identity_id = _new.identity_id AND n.id <> _new.id
    ) THEN
        RAISE EXCEPTION 'ASSERT_FAIL: Identity Recursion in Path.';
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- [ORCHESTRATION: Main Trigger]
CREATE OR REPLACE FUNCTION v4_l1.trg_l1_core_orchestrator() RETURNS trigger AS $$
DECLARE
    _p_path ltree;
BEGIN
    IF TG_OP = 'UPDATE' THEN NEW.version := OLD.version + 1; END IF;
    
    -- Only re-calculate path and re-assert if structure changed
    IF (TG_OP = 'INSERT') OR (NEW.parent_id IS DISTINCT FROM OLD.parent_id) OR (NEW.identity_id IS DISTINCT FROM OLD.identity_id) THEN
        IF NEW.parent_id IS NULL THEN 
            NEW.node_path := ('_' || replace(NEW.id::text, '-', ''))::ltree;
        ELSE
            SELECT node_path FROM v4_l1.nodes WHERE id = NEW.parent_id INTO _p_path;
            IF _p_path IS NULL THEN RAISE EXCEPTION 'ASSERT_FAIL: Parent node path not found.'; END IF;
            NEW.node_path := _p_path || ('_' || replace(NEW.id::text, '-', ''))::ltree;
        END IF;

        PERFORM v4_l1.fn_assert_l1_invariants(NEW, CASE WHEN TG_OP = 'UPDATE' THEN OLD ELSE NULL END);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- [LOGIC: Subtree Propagation]
CREATE OR REPLACE FUNCTION v4_l1.fn_l1_propagation() RETURNS trigger AS $$
BEGIN
    IF (pg_trigger_depth() > 1) THEN RETURN NEW; END IF;
    IF (OLD.node_path IS DISTINCT FROM NEW.node_path) THEN
        UPDATE v4_l1.nodes SET node_path = NEW.node_path || subpath(node_path, nlevel(OLD.node_path))
        WHERE node_path <@ OLD.node_path AND id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l1_node_before BEFORE INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_l1_core_orchestrator();
CREATE TRIGGER trg_l1_node_after AFTER UPDATE OF node_path ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.fn_l1_propagation();
