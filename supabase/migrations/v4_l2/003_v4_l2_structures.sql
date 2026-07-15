CREATE TABLE v4_l2.departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL UNIQUE REFERENCES v4_l1.nodes(id) ON DELETE RESTRICT,
    organization_id uuid NOT NULL REFERENCES v4_l2.organizations(id),
    display_name text NOT NULL
);

CREATE TABLE v4_l2.positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL UNIQUE REFERENCES v4_l1.nodes(id) ON DELETE RESTRICT,
    department_id uuid NOT NULL REFERENCES v4_l2.departments(id),
    title text NOT NULL,
    reports_to_id uuid REFERENCES v4_l2.positions(id)
);
