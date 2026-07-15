-- Departments linked to L1 Nodes
CREATE TABLE v4_l2.departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL UNIQUE REFERENCES v4_l1.nodes(id) ON DELETE RESTRICT,
    display_name text NOT NULL,
    budget_code text,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Positions linked to L1 Nodes
CREATE TABLE v4_l2.positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL UNIQUE REFERENCES v4_l1.nodes(id) ON DELETE RESTRICT,
    title text NOT NULL,
    reports_to_position_id uuid REFERENCES v4_l2.positions(id),
    metadata jsonb DEFAULT '{}'::jsonb
);
