-- MJRH V4 — Layer 1: THE FROZEN CORE (v2.6)
CREATE SCHEMA IF NOT EXISTS v4_l1;
CREATE EXTENSION IF NOT EXISTS ltree;

-- [TABLE] Identity Registry
CREATE TABLE v4_l1.identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    global_urn text UNIQUE NOT NULL,
    legal_name text NOT NULL,
    is_sovereign_root boolean DEFAULT false,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- [TABLE] Topology Nodes
CREATE TABLE v4_l1.nodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id uuid NOT NULL REFERENCES v4_l1.identities(id),
    parent_id uuid REFERENCES v4_l1.nodes(id),
    node_class text NOT NULL CHECK (node_class IN ('SOVEREIGN_ROOT', 'INTERNAL_NODE')),
    lifecycle_status text NOT NULL DEFAULT 'ACTIVE' CHECK (lifecycle_status IN ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    node_path ltree,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nodes_path_gist ON v4_l1.nodes USING gist(node_path);

-- [RPC: Resolve Sovereign Root]
CREATE OR REPLACE FUNCTION v4_l1.resolve_sovereign_root(target_node_id uuid)
RETURNS jsonb AS $$
DECLARE
    _path ltree;
    _root_id uuid;
BEGIN
    SELECT node_path FROM v4_l1.nodes WHERE id = target_node_id;
    IF _path IS NULL THEN RETURN NULL; END IF;
    _root_id := (replace(subltree(_path, 0, 1)::text, '_', ''))::uuid;
    RETURN jsonb_build_object('sovereign_id', _root_id, 'path', _path::text);
END;
$$ LANGUAGE plpgsql STABLE;

-- [LOGIC: Invariant Enforcement]
CREATE OR REPLACE FUNCTION v4_l1.fn_l1_node_guard() RETURNS trigger AS $$
DECLARE
    _is_sov boolean;
    _p_path ltree;
BEGIN
    IF (TG_OP = 'INSERT') OR (NEW.parent_id IS DISTINCT FROM OLD.parent_id) THEN
        IF NEW.parent_id IS NULL THEN
            SELECT is_sovereign_root INTO _is_sov FROM v4_l1.identities WHERE id = NEW.identity_id;
            IF NOT _is_sov THEN RAISE EXCEPTION 'NON_SOVEREIGN_ROOT_VIOLATION'; END IF;
        END IF;

        IF NEW.parent_id IS NOT NULL THEN
            SELECT node_path FROM v4_l1.nodes WHERE id = NEW.parent_id INTO _p_path;
        END IF;

        -- Cycle Detection
        IF (TG_OP = 'UPDATE') AND (NEW.parent_id IS NOT NULL) THEN
            IF (OLD.node_path @> _p_path) THEN
                RAISE EXCEPTION 'CIRCULAR_DEPENDENCY_VIOLATION';
            END IF;
        END IF;

        -- Path Calculation
        IF NEW.parent_id IS NULL THEN 
            NEW.node_path := ('_' || replace(NEW.id::text, '-', ''))::label::ltree;
        ELSE
            NEW.node_path := _p_path || ('_' || replace(NEW.id::text, '-', ''))::label::ltree;
        END IF;

        -- Identity Recursion (Disjoint branch check)
        IF EXISTS (
            SELECT 1 FROM v4_l1.nodes 
            WHERE identity_id = NEW.identity_id AND id <> NEW.id
            AND (node_path @> NEW.node_path OR node_path <@ NEW.node_path)
        ) THEN
            RAISE EXCEPTION 'IDENTITY_PATH_RECURSION_VIOLATION';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- [LOGIC: Subtree Propagation with Recursive Guard]
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

CREATE TRIGGER trg_l1_node_before BEFORE INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.fn_l1_node_guard();
CREATE TRIGGER trg_l1_node_after AFTER UPDATE OF node_path ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.fn_l1_propagation();
