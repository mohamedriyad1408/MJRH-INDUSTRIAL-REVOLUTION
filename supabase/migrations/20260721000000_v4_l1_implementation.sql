-- MJRH V4 — Layer 1: HARDENED CORE (v3.1 - SELF-AUDITED)
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

-- [TABLE] Structural Mutation Facts
CREATE TABLE v4_l1.structural_mutation_facts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL,
    fact_type text NOT NULL,
    previous_path ltree,
    new_path ltree NOT NULL,
    occurred_at timestamptz DEFAULT now()
);

-- [LOGIC: Invariant Assertions]
CREATE OR REPLACE FUNCTION v4_l1.fn_assert_l1_invariants(_new v4_l1.nodes, _old v4_l1.nodes DEFAULT NULL) RETURNS void AS $$
DECLARE
    _is_sov boolean;
BEGIN
    -- 1. Sovereign Root Requirement
    IF _new.parent_id IS NULL THEN
        SELECT is_sovereign_root INTO _is_sov FROM v4_l1.identities WHERE id = _new.identity_id;
        IF NOT _is_sov THEN RAISE EXCEPTION 'NON_SOVEREIGN_ROOT' USING ERRCODE = 'P1102'; END IF;
    END IF;

    -- 2. Cycle Detection
    IF _old IS NOT NULL AND _new.parent_id IS DISTINCT FROM _old.parent_id THEN
        IF _old.node_path @> (SELECT node_path FROM v4_l1.nodes WHERE id = _new.parent_id) THEN
            RAISE EXCEPTION 'CIRCULAR_DEPENDENCY' USING ERRCODE = 'P1104';
        END IF;
    END IF;

    -- 3. GLOBAL Identity Path Uniqueness (Hardened)
    -- Ensures neither ancestors NOR descendants of the moved node violate the 1:N disjoint rule.
    IF EXISTS (
        SELECT 1 FROM v4_l1.nodes n
        WHERE n.node_path <@ CASE WHEN _old IS NOT NULL THEN _old.node_path ELSE _new.node_path END
        AND EXISTS (
            SELECT 1 FROM v4_l1.nodes anc
            WHERE anc.id IN (SELECT (replace(lbl, '_', ''))::uuid FROM unnest(ltree2text_array(_new.node_path)) AS lbl)
            AND anc.identity_id = n.identity_id
            AND anc.id <> n.id
        )
    ) THEN
        RAISE EXCEPTION 'IDENTITY_PATH_RECURSION' USING ERRCODE = 'P1103';
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- [ORCHESTRATION: Main Trigger]
CREATE OR REPLACE FUNCTION v4_l1.trg_l1_orchestrator() RETURNS trigger AS $$
DECLARE
    _p_path ltree;
BEGIN
    IF TG_OP = 'UPDATE' THEN NEW.version := OLD.version + 1; END IF;
    
    IF NEW.parent_id IS NULL THEN 
        NEW.node_path := ('_' || replace(NEW.id::text, '-', ''))::ltree;
    ELSE
        SELECT node_path INTO _p_path FROM v4_l1.nodes WHERE id = NEW.parent_id FOR UPDATE;
        IF _p_path IS NULL THEN RAISE EXCEPTION 'PARENT_NOT_FOUND' USING ERRCODE = 'P1101'; END IF;
        NEW.node_path := _p_path || ('_' || replace(NEW.id::text, '-', ''))::ltree;
    END IF;

    PERFORM v4_l1.fn_assert_l1_invariants(NEW, CASE WHEN TG_OP = 'UPDATE' THEN OLD ELSE NULL END);

    INSERT INTO v4_l1.structural_mutation_facts (node_id, fact_type, previous_path, new_path)
    VALUES (NEW.id, TG_OP, CASE WHEN TG_OP = 'UPDATE' THEN OLD.node_path ELSE NULL END, NEW.node_path);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER trg_l1_before BEFORE INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_l1_orchestrator();
CREATE TRIGGER trg_l1_after AFTER UPDATE OF node_path ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.fn_propagate_path();

-- [RPCs]
CREATE OR REPLACE FUNCTION v4_l1.resolve_sovereign_root(_node_id uuid) RETURNS jsonb AS $$
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

CREATE OR REPLACE FUNCTION v4_l1.resolve_hierarchy(_node_id uuid) RETURNS text[] AS $$
BEGIN
    RETURN (SELECT ltree2text_array(node_path) FROM v4_l1.nodes WHERE id = _node_id);
END;
$$ LANGUAGE plpgsql STABLE;
