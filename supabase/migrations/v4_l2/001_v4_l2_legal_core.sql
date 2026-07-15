-- MJRH V4 — Layer 2: Legal Identity Core
CREATE SCHEMA IF NOT EXISTS v4_l2;

-- [TYPES]
DO $$ BEGIN
    CREATE TYPE v4_l2.actor_type AS ENUM ('HUMAN', 'SERVICE', 'SYNTHETIC');
    CREATE TYPE v4_l2.assignment_status AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [TABLE] Unified Actors
CREATE TABLE v4_l2.actors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id uuid NOT NULL UNIQUE REFERENCES v4_l1.identities(id),
    type v4_l2.actor_type NOT NULL,
    sovereign_root_id uuid NOT NULL, -- Direct denormalized link for RLS performance
    created_at timestamptz DEFAULT now()
);

-- [TABLE] Human Details (PII Vault - Encrypted in application layer)
CREATE TABLE v4_l2.persons (
    actor_id uuid PRIMARY KEY REFERENCES v4_l2.actors(id),
    first_name_cipher text,
    last_name_cipher text,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- [TABLE] Position Instances (Anchored to L1 Nodes)
CREATE TABLE v4_l2.positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL UNIQUE REFERENCES v4_l1.nodes(id),
    job_definition_id uuid, -- Link to global job catalog
    reports_to_id uuid REFERENCES v4_l2.positions(id),
    current_state v4_l2.assignment_status DEFAULT 'ACTIVE',
    created_at timestamptz DEFAULT now()
);

-- [TABLE] Assignments (Versioned & Hashed)
CREATE TABLE v4_l2.assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL REFERENCES v4_l2.actors(id),
    position_id uuid NOT NULL REFERENCES v4_l2.positions(id),
    status v4_l2.assignment_status DEFAULT 'ACTIVE',
    version bigint NOT NULL DEFAULT 1,
    effective_range tstzrange NOT NULL, -- Atomic overlap prevention
    digest text, -- Cryptographic hash
    prev_digest text,
    created_at timestamptz DEFAULT now(),
    
    -- Invariant: One primary per sovereign org
    EXCLUDE USING gist (actor_id WITH =, effective_range WITH &&) WHERE (status = 'ACTIVE')
);

CREATE INDEX idx_assignment_temporal ON v4_l2.assignments USING gist (effective_range);
