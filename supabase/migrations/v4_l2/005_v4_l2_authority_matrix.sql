-- MJRH V4 — Layer 2: Authority Matrix (v1.0)
CREATE TABLE v4_l2.authorities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES v4_l2.assignments(id),
    domain v4_l2.signature_domain NOT NULL,
    authority_class v4_l2.authority_class NOT NULL,
    limit_amount numeric(20,2), -- Linked to Currency in metadata
    currency_urn text, -- Fixed: Explicit Currency Link from L1
    is_active boolean DEFAULT true,
    version int DEFAULT 1,
    created_at timestamptz DEFAULT now()
);
