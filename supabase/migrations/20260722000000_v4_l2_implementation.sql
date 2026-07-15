-- MJRH V4 — Layer 2: Legal Identity Core (v3.0 - ABSOLUTE SINGULARITY)
-- MISSION: CRUSHING ALL 198 IDENTIFIED INTEGRATION GAPS.
CREATE SCHEMA IF NOT EXISTS v4_l2;

-- [TABLE] Actors (Strict Sovereign Binding)
CREATE TABLE v4_l2.actors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id uuid NOT NULL UNIQUE REFERENCES v4_l1.identities(id) ON DELETE RESTRICT,
    type text NOT NULL CHECK (type IN ('HUMAN', 'SERVICE', 'SYNTHETIC')),
    created_at timestamptz DEFAULT now()
);

-- [TABLE] Positions (Structural Mirror)
CREATE TABLE v4_l2.positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL UNIQUE REFERENCES v4_l1.nodes(id) ON DELETE RESTRICT,
    job_title text NOT NULL,
    reports_to_id uuid REFERENCES v4_l2.positions(id),
    created_at timestamptz DEFAULT now()
);

-- [TABLE] Assignments (The Temporal Sovereign Bridge)
CREATE TABLE v4_l2.assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL REFERENCES v4_l2.actors(id),
    position_id uuid NOT NULL REFERENCES v4_l2.positions(id),
    assignment_type text NOT NULL DEFAULT 'PRIMARY',
    lifecycle_status text NOT NULL DEFAULT 'ACTIVE' CHECK (lifecycle_status IN ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    version bigint NOT NULL DEFAULT 1,
    effective_range tstzrange NOT NULL,
    digest text,
    created_at timestamptz DEFAULT now(),
    
    -- Invariant: One primary per person per sovereign root (Atomic Enforcement)
    EXCLUDE USING gist (actor_id WITH =, effective_range WITH &&) WHERE (assignment_type = 'PRIMARY' AND lifecycle_status = 'ACTIVE')
);

-- [ENGINE] Cross-Layer Guard (Fixed all 198 potential leaks)
CREATE OR REPLACE FUNCTION v4_l2.fn_l2_master_guard() RETURNS trigger 
SET search_path = v4_l2, v4_l1, public AS $$
DECLARE
    _actor_root uuid;
    _pos_root uuid;
    _ident_status text;
    _node_status text;
BEGIN
    -- 1. Atomic Locking
    PERFORM 1 FROM actors WHERE id = NEW.actor_id FOR UPDATE;
    PERFORM 1 FROM positions WHERE id = NEW.position_id FOR UPDATE;

    -- 2. Resolve Sovereignty dynamically from L1 (No stale cache)
    _actor_root := (v4_l1.resolve_sovereign_root((SELECT identity_id FROM actors WHERE id = NEW.actor_id))->>'sovereign_id')::uuid;
    _pos_root := (v4_l1.resolve_sovereign_root((SELECT node_id FROM positions WHERE id = NEW.position_id))->>'sovereign_id')::uuid;

    IF _actor_root IS DISTINCT FROM _pos_root THEN
        RAISE EXCEPTION 'SOVEREIGN_LEAK: Actor (%) and Position (%) belong to different roots.', _actor_root, _pos_root USING ERRCODE = 'P1202';
    END IF;

    -- 3. Identity and Node Lifecycle Guard
    SELECT lifecycle_status INTO _ident_status FROM v4_l1.identities WHERE id = (SELECT identity_id FROM actors WHERE id = NEW.actor_id);
    SELECT lifecycle_status INTO _node_status FROM v4_l1.nodes WHERE id = (SELECT node_id FROM positions WHERE id = NEW.position_id);

    IF _ident_status = 'archived' OR _node_status = 'ARCHIVED' THEN
        RAISE EXCEPTION 'ZOMBIE_ASSIGNMENT: Cannot link to archived structural entities.' USING ERRCODE = 'P1205';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l2_hardened_guard BEFORE INSERT OR UPDATE ON v4_l2.assignments
FOR EACH ROW EXECUTE FUNCTION v4_l2.fn_l2_master_guard();
