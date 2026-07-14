CREATE TABLE v4_l1.identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    global_urn text UNIQUE NOT NULL CHECK (global_urn = lower(global_urn)),
    legal_name text NOT NULL,
    is_sovereign_root boolean DEFAULT false,
    sovereign_owner_id uuid,
    current_state v4_l1.lifecycle_state NOT NULL DEFAULT 'ACTIVE',
    version bigint NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
