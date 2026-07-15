-- MJRH V4 — Layer 1: SECURITY HARDENING (v1.1)
ALTER TABLE v4_l1.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE v4_l1.identities ENABLE ROW LEVEL SECURITY;

-- Production Grade RLS: Uses Session Context GUC for O(1) checks
CREATE POLICY nodes_sovereign_isolation ON v4_l1.nodes 
FOR ALL TO authenticated 
USING (
    subltree(node_path, 0, 1)::text = current_setting('app.current_sovereign_label', true)
);
