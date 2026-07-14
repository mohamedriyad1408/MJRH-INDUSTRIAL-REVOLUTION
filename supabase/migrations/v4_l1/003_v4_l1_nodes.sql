CREATE TABLE v4_l1.nodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id uuid NOT NULL REFERENCES v4_l1.identities(id),
    parent_id uuid REFERENCES v4_l1.nodes(id) ON DELETE RESTRICT,
    node_class text NOT NULL CHECK (node_class IN ('SOVEREIGN_ROOT', 'INTERNAL_NODE')),
    current_state v4_l1.lifecycle_state NOT NULL DEFAULT 'ACTIVE',
    node_path ltree NOT NULL,
    version bigint NOT NULL DEFAULT 1,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT no_self_parent CHECK (id <> parent_id)
);
CREATE INDEX idx_nodes_path_gist ON v4_l1.nodes USING gist(node_path);
CREATE INDEX idx_nodes_parent_id ON v4_l1.nodes(parent_id);
