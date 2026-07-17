-- MJRH V4 — Layer 7: NAVIGATION & LAYOUT PROJECTION (v1.0)
-- ARCHITECTURAL GRADE: FULL METADATA PROJECTION

-- [ENGINE] Resolve Sovereign Navigation
-- Generates a dynamic navigation tree for an Actor based on L1 structure and L2 mandates.
CREATE OR REPLACE FUNCTION v4_l7.fn_v_get_actor_navigation(_actor_id uuid)
RETURNS jsonb
SET search_path = v4_l7, v4_l2, v4_l1, public
AS $$
DECLARE
    _sov_root_id uuid;
    _nav_tree jsonb;
BEGIN
    -- 1. Resolve Sovereign Context
    SELECT sovereign_root_id INTO _sov_root_id FROM v4_l2.actors WHERE id = _actor_id;

    -- 2. Build Tree: Only show items where Actor has the required Mandate
    -- This links L7 UI visibility directly to L2 Authority Matrix.
    SELECT jsonb_agg(sub) INTO _nav_tree
    FROM (
        SELECT 
            fs.id,
            a.name as activity_name,
            vs.name as stream_name,
            fs.ui_config->>'icon' as icon,
            fs.ui_config->>'route' as route
        FROM v4_l7.form_schemas fs
        JOIN v4_l4.activities a ON fs.activity_id = a.id
        JOIN v4_l4.value_streams vs ON a.stream_id = vs.id
        WHERE vs.sovereign_root_id = _sov_root_id
        AND EXISTS (
            -- Mandate Check: Does the actor have authority for this activity?
            SELECT 1 FROM v4_l2.assignments ass
            JOIN v4_l2.authorities auth ON ass.id = auth.assignment_id
            WHERE ass.actor_id = _actor_id 
            AND ass.lifecycle_status = 'ACTIVE'
            AND auth.authority_class = a.mandate_required
        )
        ORDER BY vs.name, a.sequence_order
    ) sub;

    RETURN COALESCE(_nav_tree, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- [RPC] Unified UI Entry Point
-- The single call a frontend needs on app initialization.
CREATE OR REPLACE FUNCTION v4_l7.rpc_get_app_context(_work_order_id uuid DEFAULT NULL)
RETURNS jsonb
SECURITY DEFINER
SET search_path = v4_l7, v4_l4, v4_l2, v4_l1, public
AS $$
DECLARE
    _actor_id uuid;
    _node_id uuid;
    _nav jsonb;
    _meta jsonb := '{}'::jsonb;
BEGIN
    -- 1. Resolve Identity
    SELECT id INTO _actor_id FROM v4_l2.actors WHERE identity_id = auth.uid() LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'UNREGISTERED_ACTOR'; END IF;

    -- 2. Get Navigation
    _nav := v4_l7.fn_v_get_actor_navigation(_actor_id);

    -- 3. Get Work Order Meta (if provided)
    IF _work_order_id IS NOT NULL THEN
        _meta := v4_l7.fn_v_get_ui_metadata(_work_order_id, _actor_id);
    END IF;

    RETURN jsonb_build_object(
        'actor_id', _actor_id,
        'navigation', _nav,
        'active_context', _meta,
        'system_time', now()
    );
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION v4_l7.rpc_get_app_context TO authenticated;
