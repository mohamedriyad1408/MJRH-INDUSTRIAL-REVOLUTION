-- MJRH V4 — Layer 2: LEGAL CORE (v4.0 - ETERNAL)
CREATE SCHEMA IF NOT EXISTS v4_l2;

-- [TYPES]
DO $$ BEGIN
    CREATE TYPE v4_l2.assignment_status AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [TABLE] Job Blueprints
CREATE TABLE v4_l2.job_blueprints (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text UNIQUE NOT NULL,
    title text NOT NULL,
    required_capabilities text[] DEFAULT '{}'
);

-- [TABLE] Positions (Structural Seat)
CREATE TABLE v4_l2.positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL UNIQUE REFERENCES v4_l1.nodes(id) ON DELETE RESTRICT,
    job_id uuid NOT NULL REFERENCES v4_l2.job_blueprints(id),
    reports_to_id uuid REFERENCES v4_l2.positions(id),
    created_at timestamptz DEFAULT now(),
    CONSTRAINT no_self_report CHECK (id <> reports_to_id)
);

-- [TABLE] Assignments (The Pulse)
CREATE TABLE v4_l2.assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL REFERENCES v4_l2.actors(id),
    position_id uuid NOT NULL REFERENCES v4_l2.positions(id),
    lifecycle_status v4_l2.assignment_status NOT NULL DEFAULT 'ACTIVE',
    version bigint NOT NULL DEFAULT 1,
    aggregate_version bigint NOT NULL DEFAULT 1,
    effective_range tstzrange NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- [VALIDATORS]
CREATE OR REPLACE FUNCTION v4_l2.fn_v_sovereign_lock(_actor_id uuid, _pos_id uuid) RETURNS void AS $$
BEGIN
    IF (SELECT sovereign_root_id FROM v4_l2.actors WHERE id = _actor_id) <> 
       (SELECT (v4_l1.resolve_sovereign_root(node_id)->>'sovereign_id')::uuid FROM v4_l2.positions WHERE id = _pos_id) 
    THEN RAISE EXCEPTION 'SOVEREIGN_LEAK' USING ERRCODE = 'P1202'; END IF;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION v4_l2.fn_v_lifecycle_integrity(_actor_id uuid, _pos_id uuid) RETURNS void AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM v4_l1.identities WHERE id = (SELECT identity_id FROM v4_l2.actors WHERE id = _actor_id) AND lifecycle_status = 'archived')
    OR EXISTS (SELECT 1 FROM v4_l1.nodes WHERE id = (SELECT node_id FROM v4_l2.positions WHERE id = _pos_id) AND lifecycle_status = 'ARCHIVED')
    THEN RAISE EXCEPTION 'ZOMBIE_ASSIGNMENT' USING ERRCODE = 'P1205'; END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- [ORCHESTRATOR]
CREATE OR REPLACE FUNCTION v4_l2.trg_l2_master_pulse() RETURNS trigger AS $$
BEGIN
    PERFORM v4_l2.fn_v_sovereign_lock(NEW.actor_id, NEW.position_id);
    PERFORM v4_l2.fn_v_lifecycle_integrity(NEW.actor_id, NEW.position_id);
    NEW.version := OLD.version + 1;
    NEW.aggregate_version := COALESCE(OLD.aggregate_version, 0) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l2_main BEFORE INSERT OR UPDATE ON v4_l2.assignments FOR EACH ROW EXECUTE FUNCTION v4_l2.trg_l2_master_pulse();
