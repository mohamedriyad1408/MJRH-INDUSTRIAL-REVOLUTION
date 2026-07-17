-- MJRH V4 — Layer 4: PROVISIONING & INSTANTIATION (v1.0)

-- [ENGINE] Provision Work Order
-- Creates a new job instance from a blueprint, anchoring it to a specific L1 node.
CREATE OR REPLACE FUNCTION v4_l4.fn_provision_work_order(
    _node_id uuid,
    _stream_id uuid,
    _actor_id uuid,
    _initial_payload jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
    _wo_id uuid;
    _first_activity record;
BEGIN
    -- 1. Validate Sovereign Integrity (L1 check via L2 proxy)
    PERFORM v4_l2.fn_v_sovereign_lock(_actor_id, (SELECT id FROM v4_l2.positions WHERE node_id = _node_id LIMIT 1));

    -- 2. Identify Entry Point (First sequence activity)
    SELECT * FROM v4_l4.activities 
    WHERE stream_id = _stream_id 
    ORDER BY sequence_order ASC LIMIT 1 INTO _first_activity;
    
    IF NOT FOUND THEN RAISE EXCEPTION 'STREAM_HAS_NO_ACTIVITIES'; END IF;

    -- 3. Create Instance
    INSERT INTO v4_l4.work_orders (
        node_id, stream_id, current_activity_id, status, actor_id, payload
    ) VALUES (
        _node_id, _stream_id, _first_activity.id, 'PENDING', _actor_id, _initial_payload
    ) RETURNING id INTO _wo_id;

    -- 4. Emit Genesis Fact
    INSERT INTO v4_l4.outbox_facts (work_order_id, node_id, actor_id, fact_type, payload)
    VALUES (_wo_id, _node_id, _actor_id, 'WO_CREATED', 
            jsonb_build_object('stream_id', _stream_id, 'initial_activity_id', _first_activity.id));

    RETURN _wo_id;
END;
$$ LANGUAGE plpgsql;
