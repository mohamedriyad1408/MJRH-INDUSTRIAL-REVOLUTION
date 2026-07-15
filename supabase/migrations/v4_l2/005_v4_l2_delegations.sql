CREATE TABLE v4_l2.delegations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_assignment_id uuid NOT NULL REFERENCES v4_l2.assignments(id),
    to_assignment_id uuid NOT NULL REFERENCES v4_l2.assignments(id),
    scope text NOT NULL, -- Functional boundary
    valid_from timestamptz NOT NULL DEFAULT now(),
    valid_until timestamptz NOT NULL,
    reason text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE v4_l2.signatures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES v4_l2.assignments(id),
    domain v4_l2.signature_domain NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    UNIQUE(assignment_id, domain)
);
