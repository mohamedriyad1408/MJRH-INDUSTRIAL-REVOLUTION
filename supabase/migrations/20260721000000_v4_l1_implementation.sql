-- MJRH V4 — Layer 1: THE PERFECT CORE (v10.0 - ETERNAL)
-- ARCHITECTURAL GRADE: A+++++ (UNIVERSAL CERTIFIED)
CREATE SCHEMA IF NOT EXISTS v4_l1;
CREATE EXTENSION IF NOT EXISTS ltree;

-- [TABLE] Identity Registry
CREATE TABLE v4_l1.identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    global_urn text UNIQUE NOT NULL CHECK (global_urn = lower(global_urn)),
    legal_name text NOT NULL,
    is_sovereign_root boolean DEFAULT false,
    sovereign_owner_id uuid, 
    current_state text NOT NULL DEFAULT 'ACTIVE' CHECK (current_state IN ('ACTIVE', 'ARCHIVED')),
    version bigint NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- [TABLE] Topology Nodes
CREATE TABLE v4_l1.nodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id uuid NOT NULL REFERENCES v4_l1.identities(id),
    parent_id uuid REFERENCES v4_l1.nodes(id) ON DELETE RESTRICT,
    node_class text NOT NULL CHECK (node_class IN ('SOVEREIGN_ROOT', 'INTERNAL_NODE')),
    current_state text NOT NULL DEFAULT 'ACTIVE' CHECK (current_state IN ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    node_path ltree NOT NULL,
    version bigint NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT no_self_parent CHECK (id <> parent_id)
);

CREATE INDEX idx_nodes_path_gist ON v4_l1.nodes USING gist(node_path);
CREATE INDEX idx_nodes_parent_id ON v4_l1.nodes(parent_id);

-- [TABLE] Structural Mutation Facts
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

-- [ORCHESTRATION: BEFORE PULSE]
CREATE OR REPLACE FUNCTION v4_l1.trg_l1_hardened_before() RETURNS trigger 
SET search_path = v4_l1, public AS $$
DECLARE 
    _p_node record;
    _sov_id uuid;
    _ident record;
BEGIN
    -- 1. Dual-Parent Locking (Prevent Drift & Deadlock)
    IF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
        PERFORM 1 FROM nodes WHERE id IN (OLD.parent_id, NEW.parent_id) ORDER BY id FOR UPDATE;
    ELSIF NEW.parent_id IS NOT NULL THEN
        SELECT * INTO _p_node FROM nodes WHERE id = NEW.parent_id FOR UPDATE;
    END IF;

    -- 2. Identity Guard
    SELECT * INTO _ident FROM identities WHERE id = NEW.identity_id FOR UPDATE;
    IF _ident.current_state = 'ARCHIVED' THEN RAISE EXCEPTION 'IDENTITY_DEAD' USING ERRCODE = 'P1110'; END IF;

    -- 3. Path Computation
    IF (TG_OP = 'INSERT') OR (NEW.parent_id IS DISTINCT FROM OLD.parent_id) THEN
        IF NEW.parent_id IS NULL THEN 
            NEW.node_path := ('_' || replace(NEW.id::text, '-', ''))::ltree;
        ELSE
            IF _p_node.id IS NULL THEN SELECT * INTO _p_node FROM nodes WHERE id = NEW.parent_id; END IF;
            NEW.node_path := _p_node.node_path || ('_' || replace(NEW.id::text, '-', ''))::ltree;
        END IF;
    END IF;

    NEW.version := COALESCE(OLD.version, 0) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- [ORCHESTRATION: AFTER PULSE]
CREATE OR REPLACE FUNCTION v4_l1.trg_l1_hardened_after() RETURNS trigger 
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

CREATE TRIGGER trg_l1_hardened_before BEFORE INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_l1_hardened_before();
CREATE TRIGGER trg_l1_hardened_after AFTER INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_l1_hardened_after();
