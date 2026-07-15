-- MJRH V4 — Layer 1: OPERATIONAL OBSERVABILITY (v1.0)
-- Views and Functions for Real-time Monitoring and Health Checks.

-- A. Monitor Outbox Health
CREATE OR REPLACE VIEW v4_l1.v_l1_outbox_telemetry AS
SELECT 
    count(*) as pending_facts,
    max(now() - created_at) as max_lag,
    sum(retry_count) as total_retries
FROM v4_l1.structural_outbox
WHERE published = false;

-- B. Structural Integrity Health Check
CREATE OR REPLACE FUNCTION v4_l1.fn_check_topology_health() 
RETURNS TABLE(issue_type text, node_id uuid, details text) 
SET search_path = v4_l1, public AS $$
BEGIN
    -- Check for Path-Parent Desync
    RETURN QUERY
    SELECT 'PATH_DESYNC'::text, n.id, 'Path does not stem from parent path'::text
    FROM nodes n
    JOIN nodes p ON n.parent_id = p.id
    WHERE NOT (p.node_path @> n.node_path);

    -- Check for Orphaned Nodes (Non-roots without parent)
    RETURN QUERY
    SELECT 'ORPHAN_NODE'::text, id, 'Internal node with no parent'::text
    FROM nodes
    WHERE parent_id IS NULL AND node_class <> 'SOVEREIGN_ROOT';
END;
$$ LANGUAGE plpgsql STABLE;
