-- MJRH V4 — Layer 3: HARDENED READINESS CORE (v2.0)
CREATE SCHEMA IF NOT EXISTS v4_l3;

-- [ENGINE] Final Hardened Readiness Evaluator
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
    SELECT * FROM v4_l3.capability_instances WHERE id = _instance_id INTO _instance;
    IF NOT FOUND THEN RETURN jsonb_build_object('state', 'UNKNOWN'); END IF;

    -- [HARDENING] Recursive CTE for Deep Dependencies
    WITH RECURSIVE dep_tree AS (
        SELECT dependency_id FROM v4_l3.capability_dependencies WHERE dependent_id = _instance.definition_id
        UNION
        SELECT d.dependency_id FROM v4_l3.capability_dependencies d
        JOIN dep_tree dt ON dt.dependency_id = d.dependent_id
    )
    SELECT dt.dependency_id INTO _unready_dependency
    FROM dep_tree dt
    LEFT JOIN v4_l3.capability_instances ci ON dt.dependency_id = ci.definition_id AND ci.org_node_id = _instance.org_node_id
    WHERE ci.id IS NULL OR ci.is_active = false LIMIT 1;

    IF FOUND THEN RETURN jsonb_build_object('state', 'MISSING_DEPENDENCY', 'capability', _unready_dependency); END IF;

    -- [HARDENING] Weighted Capacity Check with Reservations
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
