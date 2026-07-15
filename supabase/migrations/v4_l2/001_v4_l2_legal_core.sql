-- MJRH V4 — Layer 2: Legal Identity Core (v2.2 Enterprise Grade)
CREATE SCHEMA IF NOT EXISTS v4_l2;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
    CREATE TYPE v4_l2.actor_type AS ENUM ('HUMAN', 'SERVICE', 'SYNTHETIC');
    CREATE TYPE v4_l2.legal_status AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
    CREATE TYPE v4_l2.assignment_type AS ENUM ('PRIMARY', 'SECONDARY', 'ACTING', 'INTERIM', 'CONSULTANT', 'EXTERNAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [TABLE] Actors
CREATE TABLE v4_l2.actors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id uuid NOT NULL UNIQUE REFERENCES v4_l1.identities(id) ON DELETE RESTRICT,
    type v4_l2.actor_type NOT NULL,
    sovereign_root_id uuid NOT NULL,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE v4_l2.actors ENABLE ROW LEVEL SECURITY;

-- [TABLE] Positions
CREATE TABLE v4_l2.positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL UNIQUE REFERENCES v4_l1.nodes(id) ON DELETE RESTRICT,
    sovereign_root_id uuid NOT NULL,
    reports_to_id uuid REFERENCES v4_l2.positions(id),
    lifecycle_status v4_l2.legal_status DEFAULT 'ACTIVE',
    created_at timestamptz DEFAULT now()
);
ALTER TABLE v4_l2.positions ENABLE ROW LEVEL SECURITY;

-- [TABLE] Assignments (The Hardened Heart)
CREATE TABLE v4_l2.assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL REFERENCES v4_l2.actors(id),
    position_id uuid NOT NULL REFERENCES v4_l2.positions(id),
    organization_id uuid NOT NULL, -- Logical link to sovereign
    assignment_type v4_l2.assignment_type NOT NULL DEFAULT 'PRIMARY',
    lifecycle_status v4_l2.legal_status NOT NULL DEFAULT 'DRAFT',
    version bigint NOT NULL DEFAULT 1,
    effective_range tstzrange NOT NULL,
    digest text, -- SHA256 of state
    prev_digest text, -- Link to previous version
    created_at timestamptz DEFAULT now(),
    
    -- Invariant: One primary per person per org
    EXCLUDE USING gist (actor_id WITH =, effective_range WITH &&) WHERE (assignment_type = 'PRIMARY' AND lifecycle_status = 'ACTIVE')
);
ALTER TABLE v4_l2.assignments ENABLE ROW LEVEL SECURITY;

-- [LOGIC: State Machine Validation]
CREATE OR REPLACE FUNCTION v4_l2.fn_validate_legal_transition(_old v4_l2.legal_status, _new v4_l2.legal_status) RETURNS boolean AS $$
BEGIN
    RETURN CASE 
        WHEN _old = 'ARCHIVED' THEN FALSE -- Permanent state
        WHEN _old = 'SUSPENDED' AND _new = 'ACTIVE' THEN TRUE
        WHEN _old = 'DRAFT' AND _new = 'ACTIVE' THEN TRUE
        WHEN _new = 'ARCHIVED' THEN TRUE
        ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- [LOGIC: Cryptographic Digest Generation]
CREATE OR REPLACE FUNCTION v4_l2.fn_generate_assignment_digest(_row v4_l2.assignments) RETURNS text AS $$
BEGIN
    RETURN encode(digest(_row.actor_id::text || _row.position_id::text || _row.effective_range::text || COALESCE(_row.prev_digest, ''), 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
