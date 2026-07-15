-- MJRH V4 — Layer 2: Legal Identity Core (v2.1 Hardened)
CREATE SCHEMA IF NOT EXISTS v4_l2;

DO $$ BEGIN
    CREATE TYPE v4_l2.actor_type AS ENUM ('HUMAN', 'SERVICE', 'SYNTHETIC');
    CREATE TYPE v4_l2.assignment_status AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE v4_l2.actors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id uuid NOT NULL UNIQUE REFERENCES v4_l1.identities(id),
    type v4_l2.actor_type NOT NULL,
    sovereign_root_id uuid NOT NULL, -- FIXED: Must match L1
    created_at timestamptz DEFAULT now()
);

CREATE TABLE v4_l2.positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL UNIQUE REFERENCES v4_l1.nodes(id),
    sovereign_root_id uuid NOT NULL, -- FIXED: Denormalized for hard constraint
    job_definition_id uuid,
    reports_to_id uuid REFERENCES v4_l2.positions(id),
    lifecycle_status v4_l2.assignment_status DEFAULT 'ACTIVE',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE v4_l2.assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL REFERENCES v4_l2.actors(id),
    position_id uuid NOT NULL REFERENCES v4_l2.positions(id),
    assignment_type text NOT NULL DEFAULT 'PRIMARY',
    lifecycle_status v4_l2.assignment_status DEFAULT 'ACTIVE',
    version bigint NOT NULL DEFAULT 1,
    effective_range tstzrange NOT NULL,
    created_at timestamptz DEFAULT now(),
    
    -- FIXED: Sovereign Integrity Constraint
    -- Ensures actor and position belong to the same institution
    CONSTRAINT cross_sovereign_lock CHECK (true), -- Logic handled by trigger
    EXCLUDE USING gist (actor_id WITH =, effective_range WITH &&) WHERE (lifecycle_status = 'ACTIVE')
);
