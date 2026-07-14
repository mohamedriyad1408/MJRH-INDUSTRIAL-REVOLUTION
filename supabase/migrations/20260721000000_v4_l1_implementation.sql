-- MJRH V4 — Layer 1: SOVEREIGN BASTION (v3.6 - FINAL HARDENED)
CREATE SCHEMA IF NOT EXISTS v4_l1;
CREATE EXTENSION IF NOT EXISTS ltree;

-- [TABLE] Identity Registry
CREATE TABLE v4_l1.identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    global_urn text UNIQUE NOT NULL,
    legal_name text NOT NULL,
    is_sovereign_root boolean DEFAULT false,
    -- Fixed Bug 2: Bind Identity to a Sovereign Root once allocated
    sovereign_owner_id uuid, 
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

-- [TABLE] Facts
CREATE TABLE v4_l1.structural_mutation_facts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL,
    fact_type text NOT NULL,
    previous_path ltree,
    new_path ltree NOT NULL,
    occurred_at timestamptz DEFAULT now()
);

-- [LOGIC: Invariant Assertions]
CREATE OR REPLACE FUNCTION v4_l1.fn_assert_l1_invariants(_new v4_l1.nodes, _old v4_l1.nodes DEFAULT NULL) RETURNS void 
SET search_path = v4_l1, public
AS $$
DECLARE
    _is_sov boolean;
    _parent_status text;
    _node_sovereign uuid;
    _identity_sovereign uuid;
BEGIN
    -- A. Immutability Guards
    IF _old IS NOT NULL THEN
        IF _old.node_class = 'SOVEREIGN_ROOT' AND _new.parent_id IS NOT NULL THEN
            RAISE EXCEPTION 'SOVEREIGN_ROOT_IMMUTABILITY_VIOLATION' USING ERRCODE = 'P1105';
        END IF;
        IF _old.node_class <> _new.node_class THEN
            RAISE EXCEPTION 'NODE_CLASS_IMMUTABILITY_VIOLATION' USING ERRCODE = 'P1106';
        END IF;
    END IF;

    -- B. Sovereign Root Identity Check
    IF _new.parent_id IS NULL THEN
        SELECT is_sovereign_root INTO _is_sov FROM identities WHERE id = _new.identity_id;
        IF NOT _is_sov THEN RAISE EXCEPTION 'NON_SOVEREIGN_ROOT' USING ERRCODE = 'P1102'; END IF;
    END IF;

    -- C. Fixed Bug 1: Zombie Guard (No mutations under ARCHIVED ancestors)
    IF _new.parent_id IS NOT NULL THEN
        SELECT lifecycle_status INTO _parent_status FROM nodes WHERE id = _new.parent_id;
        IF _parent_status = 'ARCHIVED' THEN
            RAISE EXCEPTION 'ARCHIVED_BRANCH_MUTATION_VIOLATION: Cannot add/move nodes under archived parent.' USING ERRCODE = 'P1108';
        END IF;
    END IF;

    -- D. Fixed Bug 2: Sovereign Identity Binding
    -- 1. Get Sovereign Root of the target node
    _node_sovereign := (replace(subltree(_new.node_path, 0, 1)::text, '_', ''))::uuid;
    -- 2. Get the bound sovereign of the identity
    SELECT sovereign_owner_id INTO _identity_sovereign FROM identities WHERE id = _new.identity_id;
    
    IF _identity_sovereign IS NULL THEN
        -- First use: bind it
        UPDATE identities SET sovereign_owner_id = _node_sovereign WHERE id = _new.identity_id;
    ELSIF _identity_sovereign <> _node_sovereign THEN
        RAISE EXCEPTION 'CROSS_SOVEREIGN_IDENTITY_LEAK: Identity already belongs to another sovereign root.' USING ERRCODE = 'P1109';
    END IF;

    -- E. Cycle Detection
    IF _old IS NOT NULL AND _new.parent_id IS DISTINCT FROM _old.parent_id THEN
        IF _old.node_path @> (SELECT node_path FROM nodes WHERE id = _new.parent_id) THEN
            RAISE EXCEPTION 'CIRCULAR_DEPENDENCY' USING ERRCODE = 'P1104';
        END IF;
    END IF;

    -- F. Identity Recursion (O(N))
    IF (pg_trigger_depth() = 1) THEN
        IF EXISTS (
            SELECT 1 FROM nodes n
            WHERE n.node_path <@ CASE WHEN _old IS NOT NULL THEN _old.node_path ELSE _new.node_path END
            AND EXISTS (
                SELECT 1 FROM nodes anc
                WHERE anc.id IN (SELECT (replace(lbl, '_', ''))::uuid FROM unnest(ltree2text_array(_new.node_path)) AS lbl)
                AND anc.identity_id = n.identity_id AND anc.id <> n.id
            )
        ) THEN
            RAISE EXCEPTION 'IDENTITY_PATH_RECURSION' USING ERRCODE = 'P1103';
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- [LOGIC: Identity Immutability]
CREATE OR REPLACE FUNCTION v4_l1.trg_identities_immutability() RETURNS trigger 
SET search_path = v4_l1, public
AS $$
BEGIN
    IF OLD.global_urn <> NEW.global_urn THEN
        RAISE EXCEPTION 'IDENTITY_URN_IMMUTABILITY_VIOLATION' USING ERRCODE = 'P1107';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l1_identities_defensive BEFORE UPDATE ON v4_l1.identities FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_identities_immutability();

-- [ORCHESTRATION: Main Trigger]
CREATE OR REPLACE FUNCTION v4_l1.trg_l1_orchestrator() RETURNS trigger 
SET search_path = v4_l1, public
AS $$
DECLARE
    _p_path ltree;
BEGIN
    NEW.version := OLD.version + 1;
    IF (TG_OP = 'INSERT') OR (NEW.parent_id IS DISTINCT FROM OLD.parent_id) THEN
        IF NEW.parent_id IS NULL THEN 
            NEW.node_path := ('_' || replace(NEW.id::text, '-', ''))::ltree;
        ELSE
            SELECT node_path INTO _p_path FROM nodes WHERE id = NEW.parent_id FOR UPDATE;
            IF _p_path IS NULL THEN RAISE EXCEPTION 'PARENT_NOT_FOUND' USING ERRCODE = 'P1101'; END IF;
            NEW.node_path := _p_path || ('_' || replace(NEW.id::text, '-', ''))::ltree;
        END IF;
        PERFORM fn_assert_l1_invariants(NEW, OLD);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- [LOGIC: Subtree Propagation & Facts]
CREATE OR REPLACE FUNCTION v4_l1.fn_after_l1_mutation() RETURNS trigger 
SET search_path = v4_l1, public
AS $$
BEGIN
    INSERT INTO structural_mutation_facts (node_id, fact_type, previous_path, new_path)
    VALUES (NEW.id, TG_OP, CASE WHEN TG_OP = 'UPDATE' THEN OLD.node_path ELSE NULL END, NEW.node_path);

    IF (pg_trigger_depth() = 1) AND (TG_OP = 'UPDATE') AND (OLD.node_path IS DISTINCT FROM NEW.node_path) THEN
        UPDATE nodes 
        SET node_path = NEW.node_path || subpath(nodes.node_path, nlevel(OLD.node_path))
        WHERE nodes.node_path <@ OLD.node_path AND nodes.id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l1_before BEFORE INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_l1_orchestrator();
CREATE TRIGGER trg_l1_after AFTER INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.fn_after_l1_mutation();

-- [RPCs]
CREATE OR REPLACE FUNCTION v4_l1.resolve_sovereign_root(_node_id uuid) RETURNS jsonb 
SET search_path = v4_l1, public
AS $$
DECLARE
    _path ltree;
    _root_id uuid;
    _sov_id uuid;
BEGIN
    SELECT node_path INTO _path FROM nodes WHERE id = _node_id;
    IF _path IS NULL THEN RETURN NULL; END IF;
    _root_id := (replace(subltree(_path, 0, 1)::text, '_', ''))::uuid;
    SELECT identity_id INTO _sov_id FROM nodes WHERE id = _root_id;
    RETURN jsonb_build_object('sovereign_id', _sov_id, 'path', _path::text);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION v4_l1.resolve_hierarchy(_node_id uuid) RETURNS text[] 
SET search_path = v4_l1, public
AS $$
BEGIN
    RETURN (SELECT ltree2text_array(node_path) FROM nodes WHERE id = _node_id);
END;
$$ LANGUAGE plpgsql STABLE;
