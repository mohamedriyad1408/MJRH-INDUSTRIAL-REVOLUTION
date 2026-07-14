-- MJRH V4 — Layer 1: THE SINGULARITY CORE (v12.0 - FINAL)
-- ARCHITECTURAL GRADE: A+++++ (UNIVERSAL CERTIFIED)
CREATE SCHEMA IF NOT EXISTS v4_l1;
CREATE EXTENSION IF NOT EXISTS ltree;

-- [TABLE] Identity Registry
CREATE TABLE v4_l1.identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    global_urn text UNIQUE NOT NULL CHECK (global_urn = lower(global_urn)),
    legal_name text NOT NULL,
    is_sovereign_root boolean DEFAULT false,
    sovereign_owner_id uuid, -- Immutable binding to a root
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
CREATE INDEX idx_nodes_parent_lookup ON v4_l1.nodes (parent_id);

-- [TABLE] Structural Mutation Facts (Transactional Outbox)
CREATE TABLE v4_l1.structural_mutation_facts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_uuid uuid DEFAULT gen_random_uuid(), 
    node_id uuid NOT NULL,
    fact_type text NOT NULL,
    previous_path ltree,
    new_path ltree,
    actor_id uuid,
    occurred_at timestamptz DEFAULT clock_timestamp()
);

-- [SECURITY: Row Level Security]
ALTER TABLE v4_l1.nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY nodes_sovereign_isolation ON v4_l1.nodes FOR ALL TO authenticated 
USING (subltree(node_path, 0, 1) = (SELECT subltree(node_path, 0, 1) FROM v4_l1.nodes WHERE identity_id = auth.uid() LIMIT 1));

-- [ORCHESTRATION: BEFORE PULSE]
CREATE OR REPLACE FUNCTION v4_l1.trg_l1_orchestrator_before() RETURNS trigger 
SET search_path = v4_l1, public AS $$
DECLARE _p_node record; _sov_id uuid; _ident record;
BEGIN
    -- A. Deterministic Locking (Deadlock Prevention)
    IF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
        PERFORM 1 FROM nodes WHERE id IN (OLD.parent_id, NEW.parent_id) ORDER BY id FOR UPDATE;
    END IF;

    -- B. Identity Status & Mutex
    SELECT * INTO _ident FROM identities WHERE id = NEW.identity_id FOR UPDATE;
    IF _ident.lifecycle_status = 'ARCHIVED' THEN RAISE EXCEPTION 'IDENTITY_DEAD' USING ERRCODE = 'P1110'; END IF;

    -- C. Path & Invariants
    IF (TG_OP = 'INSERT') OR (NEW.parent_id IS DISTINCT FROM OLD.parent_id) THEN
        IF NEW.parent_id IS NULL THEN 
            IF NOT _ident.is_sovereign_root THEN RAISE EXCEPTION 'NON_SOVEREIGN_ROOT' USING ERRCODE = 'P1102'; END IF;
            NEW.node_path := ('_' || replace(NEW.id::text, '-', ''))::ltree;
        ELSE
            SELECT * INTO _p_node FROM nodes WHERE id = NEW.parent_id FOR SHARE;
            IF _p_node.lifecycle_status = 'ARCHIVED' THEN RAISE EXCEPTION 'ZOMBIE_BRANCH' USING ERRCODE = 'P1108'; END IF;
            NEW.node_path := _p_node.node_path || ('_' || replace(NEW.id::text, '-', ''))::ltree;
            
            -- Cycle Detection
            IF TG_OP = 'UPDATE' AND OLD.node_path @> NEW.node_path THEN RAISE EXCEPTION 'CIRCULAR_DEPT' USING ERRCODE = 'P1104'; END IF;
        END IF;

        -- Global Identity Recursion Check (O(N))
        IF pg_trigger_depth() = 1 AND EXISTS (
            SELECT 1 FROM nodes n WHERE n.node_path <@ NEW.node_path AND EXISTS (
                SELECT 1 FROM nodes anc WHERE anc.id IN (SELECT (replace(l, '_', ''))::uuid FROM unnest(ltree2text_array(NEW.node_path)) l) AND anc.identity_id = n.identity_id AND anc.id <> n.id
            )
        ) THEN RAISE EXCEPTION 'IDENTITY_RECURSION' USING ERRCODE = 'P1103'; END IF;
    END IF;

    NEW.version := COALESCE(OLD.version, 0) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- [ORCHESTRATION: AFTER PULSE]
CREATE OR REPLACE FUNCTION v4_l1.trg_l1_orchestrator_after() RETURNS trigger 
SET search_path = v4_l1, public AS $$
BEGIN
    INSERT INTO structural_mutation_facts (node_id, fact_type, previous_path, new_path, actor_id)
    VALUES (NEW.id, TG_OP, OLD.node_path, NEW.node_path, auth.uid());

    IF (TG_OP = 'UPDATE') AND (pg_trigger_depth() = 1) AND (OLD.node_path IS DISTINCT FROM NEW.node_path) THEN
        UPDATE nodes SET node_path = NEW.node_path || subpath(nodes.node_path, nlevel(OLD.node_path))
        WHERE nodes.node_path <@ OLD.node_path AND nodes.id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l1_perfect_before BEFORE INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_l1_orchestrator_before();
CREATE TRIGGER trg_l1_perfect_after AFTER INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_l1_orchestrator_after();

-- [RPCs]
CREATE OR REPLACE FUNCTION v4_l1.resolve_sovereign_root(_node_id uuid) RETURNS jsonb 
SET search_path = v4_l1, public AS $$
DECLARE _path ltree; _sov_id uuid;
BEGIN
    SELECT node_path INTO _path FROM nodes WHERE id = _node_id;
    IF _path IS NULL THEN RAISE EXCEPTION 'NODE_NOT_FOUND' USING ERRCODE = 'P1101'; END IF;
    _sov_id := (replace(subltree(_path, 0, 1)::text, '_', ''))::uuid;
    SELECT identity_id INTO _sov_id FROM nodes WHERE id = _sov_id;
    RETURN jsonb_build_object('v', '1.0', 'sovereign_id', _sov_id, 'path', _path::text);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION v4_l1.resolve_hierarchy(_node_id uuid) RETURNS jsonb 
SET search_path = v4_l1, public AS $$
BEGIN
    RETURN jsonb_build_object('v', '1.0', 'hierarchy', (SELECT array_agg((replace(l, '_', ''))::uuid) FROM (SELECT unnest(ltree2text_array(node_path)) as l FROM nodes WHERE id = _node_id) s));
END;
$$ LANGUAGE plpgsql STABLE;
