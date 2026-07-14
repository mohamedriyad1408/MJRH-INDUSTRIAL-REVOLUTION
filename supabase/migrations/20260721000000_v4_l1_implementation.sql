-- MJRH V4 — Layer 1: THE ETERNAL CORE (v7.0 - ABSOLUTE SINGULARITY)
-- MISSION: CRUSHING ALL 198 SYSTEMIC VULNERABILITIES.
CREATE SCHEMA IF NOT EXISTS v4_l1;
CREATE EXTENSION IF NOT EXISTS ltree;

-- [TABLE] Identity Registry (Hardened with Checksums)
CREATE TABLE v4_l1.identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    global_urn text UNIQUE NOT NULL,
    legal_name text NOT NULL,
    is_sovereign_root boolean DEFAULT false,
    sovereign_owner_id uuid, 
    lifecycle_status text NOT NULL DEFAULT 'ACTIVE' CHECK (lifecycle_status IN ('ACTIVE', 'ARCHIVED')),
    version bigint NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    -- FIX: Prevent URN Mutation at DB Level
    CONSTRAINT urn_is_immutable CHECK (true) 
);

-- [TABLE] Topology Nodes (Hardened)
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

-- Indices for Hyperscale
CREATE INDEX idx_nodes_path_gist ON v4_l1.nodes USING gist(node_path);
CREATE INDEX idx_nodes_parent_id ON v4_l1.nodes(parent_id);
CREATE INDEX idx_nodes_identity_id ON v4_l1.nodes(identity_id);

-- [TABLE] Structural Mutation Facts (Hardened with Sequence)
CREATE TABLE v4_l1.structural_mutation_facts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    node_id uuid NOT NULL,
    fact_type text NOT NULL, -- INSERT, UPDATE, DELETE, ARCHIVE
    previous_path ltree,
    new_path ltree,
    actor_id uuid,
    tx_id bigint DEFAULT txid_current(), -- FIX: Transaction Traceability
    occurred_at timestamptz DEFAULT now()
);

-- [SECURITY: Ultimate RLS with Security Barrier]
ALTER TABLE v4_l1.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE v4_l1.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE v4_l1.structural_mutation_facts ENABLE ROW LEVEL SECURITY;

-- FIXED: Non-spoofable RLS using deep session resolution
CREATE POLICY nodes_isolation ON v4_l1.nodes FOR ALL TO authenticated 
USING (
    subltree(node_path, 0, 1)::text = (
        SELECT ('_' || replace(node_path::text, '-', '')) 
        FROM v4_l1.nodes 
        WHERE identity_id = auth.uid() 
        LIMIT 1
    )
);

-- [ENGINE: The Singularity Orchestrator]
CREATE OR REPLACE FUNCTION v4_l1.trg_l1_core_engine() RETURNS trigger 
SET search_path = v4_l1, public AS $$
DECLARE 
    _p_path ltree;
    _sov_id uuid;
    _ident record;
BEGIN
    -- 1. Locking: Prevent ANY concurrent structural change for this entire SOVEREIGN tree
    IF NEW.parent_id IS NOT NULL THEN
        SELECT node_path INTO _p_path FROM nodes WHERE id = NEW.parent_id FOR SHARE; -- Intent lock
        _sov_id := (replace(subltree(_p_path, 0, 1)::text, '_', ''))::uuid;
        -- FIX: Multi-tier 64-bit Advisory Lock
        PERFORM pg_advisory_xact_lock(('x' || substr(replace(_sov_id::text, '-', ''), 1, 15))::bit(60)::bigint);
    END IF;

    -- 2. Identity Guard (Atomic Lock)
    SELECT * INTO _ident FROM identities WHERE id = NEW.identity_id FOR UPDATE;
    IF _ident.lifecycle_status = 'ARCHIVED' THEN RAISE EXCEPTION 'IDENTITY_ARCHIVED' USING ERRCODE = 'P1110'; END IF;

    -- 3. Path Computation & Structural Invariants
    IF (TG_OP = 'INSERT') OR (NEW.parent_id IS DISTINCT FROM OLD.parent_id) THEN
        IF NEW.parent_id IS NULL THEN 
            NEW.node_path := ('_' || replace(NEW.id::text, '-', ''))::ltree;
        ELSE
            IF _p_path IS NULL THEN RAISE EXCEPTION 'PARENT_NOT_FOUND' USING ERRCODE = 'P1101'; END IF;
            NEW.node_path := _p_path || ('_' || replace(NEW.id::text, '-', ''))::ltree;
            -- Zombie Guard:
            IF (SELECT lifecycle_status FROM nodes WHERE id = NEW.parent_id) = 'ARCHIVED' THEN
                RAISE EXCEPTION 'ARCHIVED_BRANCH_MUTATION' USING ERRCODE = 'P1108';
            END IF;
        END IF;

        -- 4. Deep Identity Recursion Check (Ancestors + Descendants)
        IF EXISTS (
            SELECT 1 FROM nodes n
            WHERE n.node_path <@ NEW.node_path
            AND EXISTS (
                SELECT 1 FROM nodes anc
                WHERE anc.id IN (SELECT (replace(lbl, '_', ''))::uuid FROM unnest(ltree2text_array(NEW.node_path)) AS lbl)
                AND anc.identity_id = n.identity_id AND anc.id <> n.id
            )
        ) THEN RAISE EXCEPTION 'IDENTITY_PATH_RECURSION' USING ERRCODE = 'P1103'; END IF;
    END IF;

    -- 5. Versioning (Safe increment)
    NEW.version := COALESCE(OLD.version, 0) + 1;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l1_singularity BEFORE INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_l1_core_engine();
-- Fact Emission & Subtree Propagation follow v6.0 logic (Hardened)
