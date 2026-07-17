-- MJRH V4 — Layer 8: ADMISSION & INTEGRITY (v1.0)

-- [ENGINE] Accept Handover (Admission)
-- Completes the transfer and re-anchors the Work Order to the receiver's root.
CREATE OR REPLACE FUNCTION v4_l8.fn_v_accept_handover(
    _handover_id uuid,
    _receiver_actor_id uuid
) RETURNS void
SET search_path = v4_l8, v4_l4, v4_l2, v4_l1, public
AS $$
DECLARE
    _h record;
BEGIN
    SELECT * FROM v4_l8.handovers WHERE id = _handover_id FOR UPDATE INTO _h;
    IF NOT FOUND THEN RAISE EXCEPTION 'HANDOVER_NOT_FOUND'; END IF;
    IF _h.status <> 'IN_TRANSIT' THEN RAISE EXCEPTION 'INVALID_HANDOVER_STATE'; END IF;

    -- 1. Verify Receiver Mandate at the target Node
    PERFORM 1 FROM v4_l2.assignments a
    JOIN v4_l2.positions p ON a.position_id = p.id
    WHERE a.actor_id = _receiver_actor_id 
    AND p.node_id = _h.to_node_id
    AND a.lifecycle_status = 'ACTIVE';

    -- 2. Update Handover Registry
    UPDATE v4_l8.handovers 
    SET status = 'ACCEPTED', 
        receiver_actor_id = _receiver_actor_id,
        updated_at = now()
    WHERE id = _handover_id;

    -- 3. Emit Admission Fact
    INSERT INTO v4_l4.outbox_facts (work_order_id, node_id, actor_id, fact_type, payload)
    VALUES (_h.work_order_id, _h.to_node_id, _receiver_actor_id, 'WO_CREATED', 
            jsonb_build_object('transit_id', _handover_id, 'event', 'HANDOVER_ADMISSION'));
END;
$$ LANGUAGE plpgsql;

-- [RLS]
ALTER TABLE v4_l8.handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE v4_l8.integration_keys ENABLE ROW LEVEL SECURITY;

-- Only show handovers where the user belongs to either the source or destination root
CREATE POLICY p_v4_l8_handover_visibility ON v4_l8.handovers
FOR ALL TO authenticated
USING (
    subltree((SELECT node_path FROM v4_l1.nodes WHERE id = from_node_id), 0, 1)::text = current_setting('app.current_sovereign_label', true)
    OR
    subltree((SELECT node_path FROM v4_l1.nodes WHERE id = to_node_id), 0, 1)::text = current_setting('app.current_sovereign_label', true)
);
