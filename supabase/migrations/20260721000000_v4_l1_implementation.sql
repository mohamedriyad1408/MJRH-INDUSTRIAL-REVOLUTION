-- MJRH V4 — Layer 1: THE ETERNAL MONOLITH (v11.0 - FINAL)
CREATE SCHEMA IF NOT EXISTS v4_l1;
CREATE EXTENSION IF NOT EXISTS ltree;

-- [TABLE] Identity Registry
CREATE TABLE v4_l1.identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    global_urn text UNIQUE NOT NULL CHECK (global_urn = lower(global_urn)),
    legal_name text NOT NULL,
    is_sovereign_root boolean DEFAULT false,
    sovereign_owner_id uuid,
    lifecycle_status text NOT NULL DEFAULT 'ACTIVE' CHECK (lifecycle_status IN ('ACTIVE', 'ARCHIVED')),
    version bigint NOT NULL DEFAULT 1,
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
CREATE INDEX idx_nodes_parent_id ON v4_l1.nodes(parent_id);

-- [SECURITY] RLS linked to auth.uid()
ALTER TABLE v4_l1.nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY nodes_isolation ON v4_l1.nodes FOR ALL TO authenticated 
USING (subltree(node_path, 0, 1) = (SELECT subltree(node_path, 0, 1) FROM v4_l1.nodes WHERE identity_id = auth.uid() LIMIT 1));

-- [LOGIC: Invariants]
CREATE OR REPLACE FUNCTION v4_l1.fn_assert_l1_invariants(_new v4_l1.nodes, _old v4_l1.nodes DEFAULT NULL) RETURNS void 
SET search_path = v4_l1, public AS $$
DECLARE _is_sov boolean;
BEGIN
    IF _new.parent_id IS NULL THEN
        SELECT is_sovereign_root INTO _is_sov FROM identities WHERE id = _new.identity_id;
        IF NOT _is_sov THEN RAISE EXCEPTION 'NON_SOVEREIGN_ROOT' USING ERRCODE = 'P1102'; END IF;
    END IF;
    IF _old IS NOT NULL AND _new.parent_id IS DISTINCT FROM _old.parent_id THEN
        IF _old.node_path @> (SELECT node_path FROM nodes WHERE id = _new.parent_id) THEN
            RAISE EXCEPTION 'CIRCULAR_DEPENDENCY' USING ERRCODE = 'P1104';
        END IF;
    END IF;
    IF (pg_trigger_depth() = 1) THEN
        IF EXISTS (SELECT 1 FROM nodes n WHERE n.node_path <@ CASE WHEN _old IS NOT NULL THEN _old.node_path ELSE _new.node_path END AND EXISTS (SELECT 1 FROM nodes anc WHERE anc.id IN (SELECT (replace(lbl, '_', ''))::uuid FROM unnest(ltree2text_array(_new.node_path)) AS lbl) AND anc.identity_id = n.identity_id AND anc.id <> n.id)) THEN
            RAISE EXCEPTION 'IDENTITY_PATH_RECURSION' USING ERRCODE = 'P1103';
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- [ORCHESTRATION]
CREATE OR REPLACE FUNCTION v4_l1.trg_l1_orchestrator() RETURNS trigger SET search_path = v4_l1, public AS $$
DECLARE _p_path ltree;
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
        PERFORM 1 FROM nodes WHERE id IN (OLD.parent_id, NEW.parent_id) ORDER BY id FOR UPDATE;
    END IF;
    IF NEW.parent_id IS NULL THEN NEW.node_path := ('_' || replace(NEW.id::text, '-', ''))::ltree;
    ELSE
        SELECT node_path INTO _p_path FROM nodes WHERE id = NEW.parent_id FOR SHARE;
        NEW.node_path := _p_path || ('_' || replace(NEW.id::text, '-', ''))::ltree;
    END IF;
    PERFORM fn_assert_l1_invariants(NEW, OLD);
    NEW.version := COALESCE(OLD.version, 0) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l1_before BEFORE INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_l1_orchestrator();
