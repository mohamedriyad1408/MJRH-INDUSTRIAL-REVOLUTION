-- MJRH V4 — Layer 1: THE FROZEN CORE (v2.7 - FINAL)
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
    version bigint NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT no_self_parent CHECK (id <> parent_id)
);

CREATE INDEX idx_nodes_path_gist ON v4_l1.nodes USING gist(node_path);

CREATE OR REPLACE FUNCTION v4_l1.fn_assert_l1_invariants(_new v4_l1.nodes, _old v4_l1.nodes DEFAULT NULL) RETURNS void AS $$
DECLARE
    _is_sov boolean;
BEGIN
    IF _new.parent_id IS NULL THEN
        SELECT is_sovereign_root INTO _is_sov FROM v4_l1.identities WHERE id = _new.identity_id;
        IF NOT _is_sov THEN RAISE EXCEPTION 'NON_SOVEREIGN_ROOT_VIOLATION'; END IF;
    END IF;

    IF _old IS NOT NULL AND _new.parent_id IS DISTINCT FROM _old.parent_id THEN
        IF _old.node_path @> (SELECT node_path FROM v4_l1.nodes WHERE id = _new.parent_id) THEN
            RAISE EXCEPTION 'CIRCULAR_DEPENDENCY_VIOLATION';
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM v4_l1.nodes n
        WHERE n.id IN (SELECT (replace(label, '_', ''))::uuid FROM unnest(ltree2text_array(_new.node_path)) AS label)
        AND n.identity_id = _new.identity_id AND n.id <> _new.id
    ) THEN
        RAISE EXCEPTION 'IDENTITY_PATH_RECURSION_VIOLATION';
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION v4_l1.trg_l1_core_orchestrator() RETURNS trigger AS $$
DECLARE
    _p_path ltree;
BEGIN
    IF TG_OP = 'UPDATE' THEN NEW.version := OLD.version + 1; END IF;
    IF NEW.parent_id IS NULL THEN 
        NEW.node_path := ('_' || replace(NEW.id::text, '-', ''))::ltree;
    ELSE
        SELECT node_path FROM v4_l1.nodes WHERE id = NEW.parent_id INTO _p_path;
        IF _p_path IS NULL THEN RAISE EXCEPTION 'PARENT_NOT_FOUND'; END IF;
        NEW.node_path := _p_path || ('_' || replace(NEW.id::text, '-', ''))::ltree;
    END IF;
    PERFORM v4_l1.fn_assert_l1_invariants(NEW, CASE WHEN TG_OP = 'UPDATE' THEN OLD ELSE NULL END);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l1_freeze_guard BEFORE INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_l1_core_orchestrator();
