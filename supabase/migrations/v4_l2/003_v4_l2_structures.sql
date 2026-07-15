CREATE TABLE v4_l2.departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL UNIQUE REFERENCES v4_l1.nodes(id) ON DELETE RESTRICT,
    organization_id uuid NOT NULL REFERENCES v4_l2.organizations(id),
    display_name text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE v4_l2.positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL UNIQUE REFERENCES v4_l1.nodes(id) ON DELETE RESTRICT,
    department_id uuid NOT NULL REFERENCES v4_l2.departments(id),
    title text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE v4_l2.reporting_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subordinate_position_id uuid NOT NULL REFERENCES v4_l2.positions(id),
    superior_position_id uuid NOT NULL REFERENCES v4_l2.positions(id),
    rel_type v4_l2.reporting_type DEFAULT 'DIRECT',
    UNIQUE(subordinate_position_id, superior_position_id, rel_type)
);
