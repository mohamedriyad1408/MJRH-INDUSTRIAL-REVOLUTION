-- MJRH V4 — Layer 4: SECURITY (v1.1)

ALTER TABLE v4_l4.value_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE v4_l4.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE v4_l4.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE v4_l4.outbox_facts ENABLE ROW LEVEL SECURITY;

-- [POLICY] Sovereign Isolation for Value Streams
-- Linked via sovereign_root_id (which is a node)
CREATE POLICY p_v4_l4_value_streams_isolation ON v4_l4.value_streams
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM v4_l1.nodes n 
        WHERE n.id = v4_l4.value_streams.sovereign_root_id
        AND subltree(n.node_path, 0, 1)::text = current_setting('app.current_sovereign_label', true)
    )
);

-- [POLICY] Sovereign Isolation for Work Orders
-- Based on node_id anchoring.
CREATE POLICY p_v4_l4_work_orders_isolation ON v4_l4.work_orders
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM v4_l1.nodes n 
        WHERE n.id = v4_l4.work_orders.node_id
        AND subltree(n.node_path, 0, 1)::text = current_setting('app.current_sovereign_label', true)
    )
);

-- [POLICY] Sovereign Isolation for Outbox Facts
CREATE POLICY p_v4_l4_outbox_facts_isolation ON v4_l4.outbox_facts
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM v4_l1.nodes n 
        WHERE n.id = v4_l4.outbox_facts.node_id
        AND subltree(n.node_path, 0, 1)::text = current_setting('app.current_sovereign_label', true)
    )
);
