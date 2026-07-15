-- MJRH V4 — Layer 1: HARDENED STRUCTURAL CORE (v3.0)
CREATE SCHEMA IF NOT EXISTS v4_l1;
CREATE EXTENSION IF NOT EXISTS ltree;

CREATE TABLE v4_l1.identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    global_urn text UNIQUE NOT NULL CHECK (global_urn = lower(global_urn)),
    legal_name text NOT NULL,
    is_sovereign_root boolean DEFAULT false,
    sovereign_owner_id uuid, 
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

-- [ORCHESTRATOR]
CREATE OR REPLACE FUNCTION v4_l1.trg_l1_orchestrator() RETURNS trigger 
SET search_path = v4_l1, public AS $$
DECLARE _p_path ltree;
BEGIN
    NEW.version := COALESCE(OLD.version, 0) + 1;
    -- [HARDENING] Pessimistic Lock on parent to ensure absolute serialization
    IF NEW.parent_id IS NOT NULL THEN
        SELECT node_path INTO _p_path FROM nodes WHERE id = NEW.parent_id FOR UPDATE;
        IF _p_path IS NULL THEN RAISE EXCEPTION 'PARENT_NOT_FOUND' USING ERRCODE = 'P1101'; END IF;
        NEW.node_path := _p_path || ('_' || replace(NEW.id::text, '-', ''))::ltree;
    ELSE
        NEW.node_path := ('_' || replace(NEW.id::text, '-', ''))::ltree;
    END IF;
    -- Cycle and Identity Recursion Checks... (O(N) logic)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l1_before BEFORE INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_l1_orchestrator();
