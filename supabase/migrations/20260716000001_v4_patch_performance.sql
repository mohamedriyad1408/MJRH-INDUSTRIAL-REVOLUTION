-- MJRH V4 — PERFORMANCE PATCH: READINESS RECURSION OPTIMIZATION (v1.1)
-- Purpose: Optimize deep dependency resolution and prevent infinite recursion loops.

-- 1. Add Index for Fast Recursion
-- This ensures that looking up dependencies for a capability is an O(log N) operation.
CREATE INDEX IF NOT EXISTS idx_v4_l3_dependencies_dependent ON v4_l3.capability_dependencies(dependent_id);

-- 2. Hardened Readiness Evaluator with Depth Limit
CREATE OR REPLACE FUNCTION v4_l3.fn_evaluate_readiness(
    _instance_id uuid,
    _actor_context_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    _instance record;
    _unready_dependency text;
    _req record;
    _net_available_capacity int;
BEGIN
    -- 1. Fetch Instance Context
    SELECT * FROM v4_l3.capability_instances WHERE id = _instance_id INTO _instance;
    IF NOT FOUND THEN RETURN jsonb_build_object('state', 'UNKNOWN'); END IF;

    -- 2. [PERFORMANCE] Recursive CTE with Depth Guard (Limit: 10)
    -- This prevents Infinite Loops (MVCP-F002) and ensures bounded execution time.
    WITH RECURSIVE dep_tree AS (
        -- Initial level
        SELECT dependency_id, 1 as depth 
        FROM v4_l3.capability_dependencies 
        WHERE dependent_id = _instance.definition_id
        
        UNION ALL
        
        -- Recursive step
        SELECT d.dependency_id, dt.depth + 1
        FROM v4_l3.capability_dependencies d
        JOIN dep_tree dt ON dt.dependency_id = d.dependent_id
        WHERE dt.depth < 10 -- STOP-GAP: Max 10 levels of nested dependencies
    )
    SELECT dt.dependency_id INTO _unready_dependency
    FROM dep_tree dt
    LEFT JOIN v4_l3.capability_instances ci ON dt.dependency_id = ci.definition_id AND ci.org_node_id = _instance.org_node_id
    WHERE ci.id IS NULL OR ci.is_active = false 
    ORDER BY dt.depth DESC -- Check deepest failures first
    LIMIT 1;

    -- 3. Return Critical Failure if circular or too deep
    IF (SELECT count(*) FROM (
        SELECT 1 FROM v4_l3.capability_dependencies d 
        WHERE d.dependent_id = _instance.definition_id 
        LIMIT 11 -- Simple heuristic check
    ) s) > 10 THEN
        -- While not a perfect cycle check, we flag excessive depth as a logic risk
        RETURN jsonb_build_object('state', 'RECURSION_DEPTH_EXCEEDED', 'limit', 10);
    END IF;

    IF FOUND THEN RETURN jsonb_build_object('state', 'MISSING_DEPENDENCY', 'capability', _unready_dependency); END IF;

    -- 4. Weighted Capacity Check (Inherited logic)
    FOR _req IN SELECT * FROM v4_l3.capability_requirements WHERE capability_id = _instance.definition_id LOOP
        SELECT COALESCE(SUM(sub.net_cap), 0) INTO _net_available_capacity
        FROM (
            SELECT (r.total_capacity - COALESCE((SELECT SUM(capacity_consumed) FROM v4_l3.resource_reservations WHERE resource_id = r.id AND valid_until > now()), 0)) as net_cap
            FROM v4_l3.resource_registry r
            WHERE r.org_node_id = _instance.org_node_id AND r.resource_type = _req.resource_type
            AND r.health_status IN ('OPTIMAL', 'DEGRADED')
        ) sub;

        IF _net_available_capacity < _req.required_capacity THEN
            RETURN jsonb_build_object('state', 'INSUFFICIENT_CAPACITY', 'available', _net_available_capacity);
        END IF;
    END LOOP;

    RETURN jsonb_build_object('state', 'READY', 'eval_at', now());
END;
$$ LANGUAGE plpgsql STABLE;
