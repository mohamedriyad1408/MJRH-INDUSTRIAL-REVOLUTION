-- MJRH V4 — Layer 1: HARDENED CORE (v2.6)
CREATE SCHEMA IF NOT EXISTS v4_l1;
CREATE EXTENSION IF NOT EXISTS ltree;

CREATE TABLE v4_l1.identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    global_urn text UNIQUE NOT NULL,
    legal_name text NOT NULL,
    is_sovereign_root boolean DEFAULT false,
    lifecycle_status text NOT NULL DEFAULT 'active' CHECK (lifecycle_status IN ('active', 'archived')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE v4_l1.nodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id uuid NOT NULL REFERENCES v4_l1.identities(id),
    parent_id uuid REFERENCES v4_l1.nodes(id) ON DELETE RESTRICT,
    node_class text NOT NULL CHECK (node_class IN ('SOVEREIGN_ROOT', 'INTERNAL_NODE')),
    lifecycle_status text NOT NULL DEFAULT 'ACTIVE' CHECK (lifecycle_status IN ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    node_path ltree NOT NULL,
    version int NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT no_self_parent CHECK (id <> parent_id)
);

CREATE INDEX idx_nodes_path_gist ON v4_l1.nodes USING gist(node_path);

CREATE OR REPLACE FUNCTION v4_l1.fn_compute_path(_node_id uuid, _parent_id uuid) RETURNS ltree AS $$
DECLARE
    _p_path ltree;
    _label label := ('_' || replace(_node_id::text, '-', ''))::label;
BEGIN
    IF _parent_id IS NULL THEN RETURN _label::ltree; END IF;
    SELECT node_path FROM v4_l1.nodes WHERE id = _parent_id INTO _p_path;
    IF _p_path IS NULL THEN RAISE EXCEPTION 'PARENT_NOT_FOUND'; END IF;
    RETURN _p_path || _label;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION v4_l1.fn_assert_invariants(_new v4_l1.nodes, _old v4_l1.nodes DEFAULT NULL) RETURNS void AS $$
DECLARE
    _is_sov boolean;
BEGIN
    IF _new.parent_id IS NULL THEN
        SELECT is_sovereign_root INTO _is_sov FROM v4_l1.identities WHERE id = _new.identity_id;
        IF NOT _is_sov THEN RAISE EXCEPTION 'NON_SOVEREIGN_ROOT'; END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM v4_l1.nodes 
        WHERE identity_id = _new.identity_id AND id <> _new.id
        AND (node_path @> _new.node_path OR node_path <@ _new.node_path)
    ) THEN
        RAISE EXCEPTION 'IDENTITY_PATH_RECURSION';
    END IF;

    IF _old IS NOT NULL AND _new.parent_id IS DISTINCT FROM _old.parent_id THEN
        IF _old.node_path @> (SELECT node_path FROM v4_l1.nodes WHERE id = _new.parent_id) THEN
            RAISE EXCEPTION 'CIRCULAR_DEPENDENCY';
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION v4_l1.trg_l1_core_orchestrator() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN NEW.version := OLD.version + 1; END IF;
    NEW.node_path := v4_l1.fn_compute_path(NEW.id, NEW.parent_id);
    PERFORM v4_l1.fn_assert_invariants(NEW, CASE WHEN TG_OP = 'UPDATE' THEN OLD ELSE NULL END);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l1_freeze_guard BEFORE INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_l1_core_orchestrator();
