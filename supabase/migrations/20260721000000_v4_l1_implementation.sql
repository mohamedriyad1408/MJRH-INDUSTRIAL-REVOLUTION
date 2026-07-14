-- MJRH V4 — Layer 1: HARDENED CORE (v2.8 - FINAL REFACTOR)
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
    node_path ltree NOT NULL,
    version bigint NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT no_self_parent CHECK (id <> parent_id)
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
    IF _p_path IS NULL THEN 
        RAISE EXCEPTION 'PARENT_NOT_FOUND' USING ERRCODE = 'P1101';
    END IF;
    RETURN _p_path || _label;
END;
$$ LANGUAGE plpgsql STABLE;

-- [LOGIC: Invariant Assertion]
CREATE OR REPLACE FUNCTION v4_l1.fn_assert_invariants(_new v4_l1.nodes, _old v4_l1.nodes DEFAULT NULL) RETURNS void AS $$
DECLARE
    _is_sov boolean;
BEGIN
    -- 1. Sovereign Root Requirement
    IF _new.parent_id IS NULL THEN
        SELECT is_sovereign_root INTO _is_sov FROM v4_l1.identities WHERE id = _new.identity_id;
        IF NOT _is_sov THEN 
            RAISE EXCEPTION 'NON_SOVEREIGN_ROOT' USING ERRCODE = 'P1102';
        END IF;
    END IF;

    -- 2. Identity Recursion (1:N Disjoint Rule)
    IF EXISTS (
        SELECT 1 FROM v4_l1.nodes n
        WHERE n.id IN (SELECT (replace(lbl, '_', ''))::uuid FROM unnest(ltree2text_array(_new.node_path)) AS lbl)
        AND n.identity_id = _new.identity_id AND n.id <> _new.id
    ) THEN
        RAISE EXCEPTION 'IDENTITY_PATH_RECURSION' USING ERRCODE = 'P1103';
    END IF;

    -- 3. Cycle Detection
    IF _old IS NOT NULL AND _new.parent_id IS DISTINCT FROM _old.parent_id THEN
        IF _old.node_path @> (SELECT node_path FROM v4_l1.nodes WHERE id = _new.parent_id) THEN
            RAISE EXCEPTION 'CIRCULAR_DEPENDENCY' USING ERRCODE = 'P1104';
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- [LOGIC: Subtree Propagation]
CREATE OR REPLACE FUNCTION v4_l1.fn_propagate_path() RETURNS trigger AS $$
BEGIN
    IF (pg_trigger_depth() > 1) THEN RETURN NEW; END IF;
    IF (OLD.node_path IS DISTINCT FROM NEW.node_path) THEN
        UPDATE v4_l1.nodes SET node_path = NEW.node_path || subpath(node_path, nlevel(OLD.node_path))
        WHERE node_path <@ OLD.node_path AND id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- [ORCHESTRATION: Trigger]
CREATE OR REPLACE FUNCTION v4_l1.trg_l1_orchestrator() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN NEW.version := OLD.version + 1; END IF;
    NEW.node_path := v4_l1.fn_compute_path(NEW.id, NEW.parent_id);
    PERFORM v4_l1.fn_assert_invariants(NEW, CASE WHEN TG_OP = 'UPDATE' THEN OLD ELSE NULL END);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l1_before BEFORE INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_l1_orchestrator();
CREATE TRIGGER trg_l1_after AFTER UPDATE OF node_path ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.fn_propagate_path();

-- [RPC: Resolve Sovereign Root]
CREATE OR REPLACE FUNCTION v4_l1.resolve_sovereign_root(_node_id uuid)
RETURNS jsonb AS $$
DECLARE
    _path ltree;
    _root_id uuid;
    _sov_id uuid;
BEGIN
    SELECT node_path INTO _path FROM v4_l1.nodes WHERE id = _node_id;
    IF _path IS NULL THEN RETURN NULL; END IF;
    _root_id := (replace(subltree(_path, 0, 1)::text, '_', ''))::uuid;
    SELECT identity_id INTO _sov_id FROM v4_l1.nodes WHERE id = _root_id;
    RETURN jsonb_build_object('sovereign_id', _sov_id, 'path', _path::text);
END;
$$ LANGUAGE plpgsql STABLE;
