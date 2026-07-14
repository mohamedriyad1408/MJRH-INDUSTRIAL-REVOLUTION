-- MJRH V4 — Layer 1: HARDENED CORE (v3.4 - AUDIT HARDENED)
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
    -- 1. Sovereign Root Immutability (FIXED: Critical Bug 1)
    -- Prevents converting a root into a child, or moving a root.
    IF _old IS NOT NULL AND _old.node_class = 'SOVEREIGN_ROOT' AND _new.parent_id IS NOT NULL THEN
        RAISE EXCEPTION 'SOVEREIGN_ROOT_IMMUTABILITY_VIOLATION' USING ERRCODE = 'P1105';
    END IF;

    -- 2. Sovereign Root Identity Requirement
    IF _new.parent_id IS NULL THEN
        SELECT is_sovereign_root INTO _is_sov FROM v4_l1.identities WHERE id = _new.identity_id;
        IF NOT _is_sov THEN RAISE EXCEPTION 'NON_SOVEREIGN_ROOT' USING ERRCODE = 'P1102'; END IF;
    END IF;

    -- 3. Cycle Detection
    IF _old IS NOT NULL AND _new.parent_id IS DISTINCT FROM _old.parent_id THEN
        IF _old.node_path @> (SELECT node_path FROM v4_l1.nodes WHERE id = _new.parent_id) THEN
            RAISE EXCEPTION 'CIRCULAR_DEPENDENCY' USING ERRCODE = 'P1104';
        END IF;
    END IF;

    -- 4. Identity Path Uniqueness (PERFORMANCE OPTIMIZED: Bug 2)
    -- Only run full check for the TOP-LEVEL node in the mutation wave
    IF (pg_trigger_depth() = 1) THEN
        IF EXISTS (
            SELECT 1 FROM v4_l1.nodes n
            WHERE n.node_path <@ CASE WHEN _old IS NOT NULL THEN _old.node_path ELSE _new.node_path END
            AND EXISTS (
                SELECT 1 FROM v4_l1.nodes anc
                WHERE anc.id IN (SELECT (replace(lbl, '_', ''))::uuid FROM unnest(ltree2text_array(_new.node_path)) AS lbl)
                AND anc.identity_id = n.identity_id AND anc.id <> n.id
            )
        ) THEN
            RAISE EXCEPTION 'IDENTITY_PATH_RECURSION' USING ERRCODE = 'P1103';
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- [ORCHESTRATION: Main Trigger]
CREATE OR REPLACE FUNCTION v4_l1.trg_l1_orchestrator() RETURNS trigger AS $$
DECLARE
    _p_path ltree;
BEGIN
    -- Increment version for every affected node
    NEW.version := OLD.version + 1;
    
    IF (TG_OP = 'INSERT') OR (NEW.parent_id IS DISTINCT FROM OLD.parent_id) THEN
        IF NEW.parent_id IS NULL THEN 
            NEW.node_path := ('_' || replace(NEW.id::text, '-', ''))::ltree;
        ELSE
            -- [CONCURRENCY: FIXED Bug 3] Pessimistic lock on parent
            SELECT node_path INTO _p_path FROM v4_l1.nodes WHERE id = NEW.parent_id FOR UPDATE;
            IF _p_path IS NULL THEN RAISE EXCEPTION 'PARENT_NOT_FOUND' USING ERRCODE = 'P1101'; END IF;
            NEW.node_path := _p_path || ('_' || replace(NEW.id::text, '-', ''))::ltree;
        END IF;
        PERFORM v4_l1.fn_assert_l1_invariants(NEW, OLD);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- [LOGIC: Subtree Propagation & Fact Emission]
CREATE OR REPLACE FUNCTION v4_l1.fn_after_l1_mutation() RETURNS trigger AS $$
BEGIN
    -- Emit Fact for every node touched
    INSERT INTO v4_l1.structural_mutation_facts (node_id, fact_type, previous_path, new_path)
    VALUES (NEW.id, TG_OP, CASE WHEN TG_OP = 'UPDATE' THEN OLD.node_path ELSE NULL END, NEW.node_path);

    -- Propagate to descendants (Only from top-level call)
    IF (pg_trigger_depth() = 1) AND (TG_OP = 'UPDATE') AND (OLD.node_path IS DISTINCT FROM NEW.node_path) THEN
        UPDATE v4_l1.nodes 
        SET node_path = NEW.node_path || subpath(v4_l1.nodes.node_path, nlevel(OLD.node_path))
        WHERE v4_l1.nodes.node_path <@ OLD.node_path AND v4_l1.nodes.id <> NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l1_before BEFORE INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_l1_orchestrator();
CREATE TRIGGER trg_l1_after AFTER INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.fn_after_l1_mutation();

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
