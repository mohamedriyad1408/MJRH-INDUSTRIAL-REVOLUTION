CREATE TABLE v4_l2.authorities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES v4_l2.assignments(id),
    auth_class v4_l2.authority_class NOT NULL,
    limit_amount numeric(20,2), -- Financial/Operational limit
    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    version int DEFAULT 1
);

CREATE TABLE v4_l2.delegations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_assignment_id uuid NOT NULL REFERENCES v4_l2.assignments(id),
    to_assignment_id uuid NOT NULL REFERENCES v4_l2.assignments(id),
    auth_id uuid NOT NULL REFERENCES v4_l2.authorities(id),
    valid_from timestamptz NOT NULL DEFAULT now(),
    valid_until timestamptz NOT NULL,
    is_revoked boolean DEFAULT false,
    reason text
);

CREATE TABLE v4_l2.signatures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES v4_l2.assignments(id),
    domain v4_l2.signature_domain NOT NULL,
    financial_limit numeric(20,2) DEFAULT 0,
    is_active boolean DEFAULT true
);
