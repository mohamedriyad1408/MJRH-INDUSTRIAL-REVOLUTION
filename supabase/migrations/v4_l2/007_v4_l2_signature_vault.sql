-- MJRH V4 — Layer 2: Signature Vault (v1.0 Hardened)
CREATE TABLE v4_l2.signature_rights (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES v4_l2.assignments(id),
    domain v4_l2.signature_domain NOT NULL,
    precedence_weight int DEFAULT 100,
    is_active boolean DEFAULT true,
    fingerprint text, -- SHA256 of the logic
    created_at timestamptz DEFAULT now(),
    UNIQUE(assignment_id, domain)
);
