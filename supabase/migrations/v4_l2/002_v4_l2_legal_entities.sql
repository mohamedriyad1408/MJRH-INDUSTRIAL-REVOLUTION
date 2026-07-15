-- Persons linked to L1 Identities
CREATE TABLE v4_l2.persons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id uuid NOT NULL UNIQUE REFERENCES v4_l1.identities(id) ON DELETE RESTRICT,
    first_name text NOT NULL,
    last_name text NOT NULL,
    date_of_birth date,
    nationality text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Organizations linked to Sovereign L1 Identities
CREATE TABLE v4_l2.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id uuid NOT NULL UNIQUE REFERENCES v4_l1.identities(id) ON DELETE RESTRICT,
    legal_name text NOT NULL,
    tax_id text,
    registration_number text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);
