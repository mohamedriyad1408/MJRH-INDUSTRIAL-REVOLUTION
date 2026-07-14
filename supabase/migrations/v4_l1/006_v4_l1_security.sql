ALTER TABLE v4_l1.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE v4_l1.identities ENABLE ROW LEVEL SECURITY;

-- Production Security Barrier: Uses Session Context
CREATE POLICY nodes_sovereign_isolation ON v4_l1.nodes 
FOR ALL TO authenticated 
USING (
    subltree(node_path, 0, 1)::text = current_setting('app.current_sovereign_label', true)
) WITH CHECK (
    subltree(node_path, 0, 1)::text = current_setting('app.current_sovereign_label', true)
);
