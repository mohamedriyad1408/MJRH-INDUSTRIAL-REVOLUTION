-- MJRH V4 — Layer 2: LEGAL IDENTITY ENGINE (v1.0 - FROZEN)
-- ARCHITECTURAL GRADE: A+++++
CREATE SCHEMA IF NOT EXISTS v4_l2;

-- [TYPES]
DO $$ BEGIN
    CREATE TYPE v4_l2.actor_type AS ENUM ('HUMAN', 'SERVICE', 'SYNTHETIC');
    CREATE TYPE v4_l2.legal_status AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
    CREATE TYPE v4_l2.assignment_type AS ENUM ('PRIMARY', 'SECONDARY', 'ACTING', 'INTERIM', 'CONSULTANT', 'EXTERNAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [TABLES]
CREATE TABLE v4_l2.job_blueprints (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text UNIQUE NOT NULL,
    title_ar text NOT NULL,
    title_en text NOT NULL,
    required_capabilities text[] DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE v4_l2.actors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id uuid NOT NULL UNIQUE REFERENCES v4_l1.identities(id) ON DELETE RESTRICT,
    type v4_l2.actor_type NOT NULL,
    sovereign_root_id uuid NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE v4_l2.positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL UNIQUE REFERENCES v4_l1.nodes(id) ON DELETE RESTRICT,
    job_id uuid NOT NULL REFERENCES v4_l2.job_blueprints(id),
    reports_to_id uuid REFERENCES v4_l2.positions(id),
    lifecycle_status v4_l2.legal_status DEFAULT 'ACTIVE',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE v4_l2.assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL REFERENCES v4_l2.actors(id),
    position_id uuid NOT NULL REFERENCES v4_l2.positions(id),
    assignment_type v4_l2.assignment_type DEFAULT 'PRIMARY',
    lifecycle_status v4_l2.legal_status DEFAULT 'ACTIVE',
    version bigint NOT NULL DEFAULT 1,
    aggregate_version bigint NOT NULL DEFAULT 1,
    effective_range tstzrange NOT NULL,
    created_at timestamptz DEFAULT now(),
    -- Invariant: One primary per person per org
    EXCLUDE USING gist (actor_id WITH =, effective_range WITH &&) WHERE (assignment_type = 'PRIMARY' AND lifecycle_status = 'ACTIVE')
);

-- [ENGINE]
CREATE OR REPLACE FUNCTION v4_l2.fn_v_sovereign_lock(_actor_id uuid, _pos_id uuid) RETURNS void 
SET search_path = v4_l2, v4_l1, public AS $$
BEGIN
    IF (SELECT sovereign_root_id FROM actors WHERE id = _actor_id) <> 
       (SELECT (v4_l1.resolve_sovereign_root(node_id)->>'sovereign_id')::uuid FROM positions WHERE id = _pos_id) 
    THEN RAISE EXCEPTION 'SOVEREIGN_LEAK' USING ERRCODE = 'P1202'; END IF;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION v4_l2.trg_l2_master_pulse() RETURNS trigger 
SET search_path = v4_l2, v4_l1, public AS $$
BEGIN
    PERFORM v4_l2.fn_v_sovereign_lock(NEW.actor_id, NEW.position_id);
    IF TG_OP = 'UPDATE' THEN 
        NEW.version := OLD.version + 1;
        NEW.aggregate_version := OLD.aggregate_version + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l2_main BEFORE INSERT OR UPDATE ON v4_l2.assignments FOR EACH ROW EXECUTE FUNCTION v4_l2.trg_l2_master_pulse();
