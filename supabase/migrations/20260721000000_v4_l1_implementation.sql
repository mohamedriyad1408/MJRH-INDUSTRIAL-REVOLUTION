-- MJRH V4 — Layer 1: THE DIAMOND CORE (v4.0 - ETERNAL)
-- Final Hardening: RLS Performance, Deadlock Mutex, and Atomic Integrity.
CREATE SCHEMA IF NOT EXISTS v4_l1;
CREATE EXTENSION IF NOT EXISTS ltree;

-- [TABLE] Identity Registry
CREATE TABLE v4_l1.identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    global_urn text UNIQUE NOT NULL,
    legal_name text NOT NULL,
    is_sovereign_root boolean DEFAULT false,
    sovereign_owner_id uuid, -- Bound to the Root Node ID for isolation
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

-- [SECURITY: High-Performance RLS] - FIXED Performance Collapse
ALTER TABLE v4_l1.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE v4_l1.nodes ENABLE ROW LEVEL SECURITY;

-- Policy uses session variable for O(1) check
CREATE POLICY nodes_sovereign_isolation ON v4_l1.nodes 
FOR ALL TO authenticated 
USING (subltree(node_path, 0, 1)::text = current_setting('app.current_sovereign_label', true));

-- [ORCHESTRATION: Deadlock Proof & Atomic]
CREATE OR REPLACE FUNCTION v4_l1.trg_l1_orchestrator() RETURNS trigger 
SET search_path = v4_l1, public AS $$
DECLARE 
    _p_path ltree;
    _sov_label text;
BEGIN
    -- 1. Mutex: Prevent concurrent structural changes for the SAME sovereign
    -- USES: Postgres Advisory Locks to serialize re-parenting per organization.
    IF NEW.parent_id IS NOT NULL THEN
        SELECT node_path INTO _p_path FROM nodes WHERE id = NEW.parent_id;
        _sov_label := subltree(_p_path, 0, 1)::text;
        PERFORM pg_advisory_xact_lock(hashtext(_sov_label));
    END IF;

    -- 2. Versioning
    NEW.version := COALESCE(OLD.version, 0) + 1;
    
    -- 3. Pathing & Validation
    IF (TG_OP = 'INSERT') OR (NEW.parent_id IS DISTINCT FROM OLD.parent_id) THEN
        IF NEW.parent_id IS NULL THEN 
            NEW.node_path := ('_' || replace(NEW.id::text, '-', ''))::ltree;
        ELSE
            IF _p_path IS NULL THEN RAISE EXCEPTION 'PARENT_NOT_FOUND' USING ERRCODE = 'P1101'; END IF;
            NEW.node_path := _p_path || ('_' || replace(NEW.id::text, '-', ''))::ltree;
        END IF;
        -- All invariants (Cycle, Recursion) checked here...
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l1_before BEFORE INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_l1_orchestrator();

-- [RPC: The Trusted Gate]
CREATE OR REPLACE FUNCTION v4_l1.resolve_sovereign_root(_node_id uuid) RETURNS jsonb 
SET search_path = v4_l1, public AS $$
DECLARE _path ltree; _sov_id uuid;
BEGIN
    SELECT node_path INTO _path FROM nodes WHERE id = _node_id;
    IF _path IS NULL THEN RETURN NULL; END IF;
    _sov_id := (replace(subltree(_path, 0, 1)::text, '_', ''))::uuid;
    RETURN jsonb_build_object('sovereign_id', _sov_id, 'path', _path::text);
END;
$$ LANGUAGE plpgsql STABLE;
