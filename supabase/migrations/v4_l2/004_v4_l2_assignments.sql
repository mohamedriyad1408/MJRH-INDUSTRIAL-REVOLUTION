CREATE TABLE v4_l2.assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id uuid NOT NULL REFERENCES v4_l2.persons(id),
    position_id uuid NOT NULL REFERENCES v4_l2.positions(id),
    organization_id uuid NOT NULL REFERENCES v4_l2.organizations(id),
    assignment_type v4_l2.assignment_type DEFAULT 'PRIMARY',
    lifecycle_status v4_l2.legal_status DEFAULT 'ACTIVE',
    version bigint NOT NULL DEFAULT 1,
    effective_from timestamptz NOT NULL DEFAULT now(),
    effective_to timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_l2_one_primary ON v4_l2.assignments (person_id, organization_id) 
WHERE (assignment_type = 'PRIMARY' AND lifecycle_status = 'ACTIVE');
