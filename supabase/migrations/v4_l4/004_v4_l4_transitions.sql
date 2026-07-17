-- MJRH V4 — Layer 4: TERMINAL LOGIC (v1.0)

-- [ENGINE] Finalize Work Order
-- Moves job to COMPLETED state and emits finality fact.
CREATE OR REPLACE FUNCTION v4_l4.fn_complete_work_order(
    _work_order_id uuid,
    _actor_id uuid,
    _final_payload jsonb DEFAULT '{}'::jsonb
) RETURNS void AS $$
DECLARE
    _wo record;
BEGIN
    SELECT * FROM v4_l4.work_orders WHERE id = _work_order_id FOR UPDATE INTO _wo;
    IF NOT FOUND THEN RAISE EXCEPTION 'WORK_ORDER_NOT_FOUND'; END IF;

    -- Validate Actor Authority
    PERFORM 1 FROM v4_l2.assignments a 
    WHERE a.actor_id = _actor_id AND a.lifecycle_status = 'ACTIVE';

    -- Update State
    UPDATE v4_l4.work_orders
    SET status = 'COMPLETED',
        payload = payload || _final_payload,
        updated_at = now(),
        version = version + 1
    WHERE id = _work_order_id;

    -- Emit Finality Fact
    INSERT INTO v4_l4.outbox_facts (work_order_id, node_id, actor_id, fact_type, payload)
    VALUES (_work_order_id, _wo.node_id, _actor_id, 'ACTIVITY_COMPLETED', _final_payload);
END;
$$ LANGUAGE plpgsql;

-- [ENGINE] Block Work Order
-- Mark as BLOCKED due to readiness failure or external exception.
CREATE OR REPLACE FUNCTION v4_l4.fn_block_work_order(
    _work_order_id uuid,
    _reason text
) RETURNS void AS $$
BEGIN
    UPDATE v4_l4.work_orders
    SET status = 'BLOCKED',
        payload = payload || jsonb_build_object('block_reason', _reason),
        updated_at = now()
    WHERE id = _work_order_id;

    INSERT INTO v4_l4.outbox_facts (work_order_id, node_id, fact_type, payload)
    SELECT id, node_id, 'WO_BLOCKED', jsonb_build_object('reason', _reason)
    FROM v4_l4.work_orders WHERE id = _work_order_id;
END;
$$ LANGUAGE plpgsql;
