-- MJRH V4 — Layer 4: RPC CATALOG (v1.0)
-- Exposes Layer 4 to authorized gateway clients.

CREATE OR REPLACE FUNCTION v4_l4.rpc_provision_job(
    _node_id uuid,
    _stream_id uuid,
    _payload jsonb DEFAULT '{}'::jsonb
) RETURNS uuid 
SECURITY DEFINER
SET search_path = v4_l4, v4_l2, v4_l1, public
AS $$
BEGIN
    -- Context validation: auth.uid() must map to an active actor
    RETURN v4_l4.fn_provision_work_order(
        _node_id, 
        _stream_id, 
        (SELECT id FROM v4_l2.actors WHERE identity_id = auth.uid() LIMIT 1),
        _payload
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION v4_l4.rpc_pulse_job(
    _job_id uuid,
    _target_activity_id uuid,
    _payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
SECURITY DEFINER
SET search_path = v4_l4, v4_l2, v4_l1, public
AS $$
BEGIN
    RETURN v4_l4.fn_execute_pulse(
        _job_id,
        _target_activity_id,
        (SELECT id FROM v4_l2.actors WHERE identity_id = auth.uid() LIMIT 1),
        _payload
    );
END;
$$ LANGUAGE plpgsql;

-- [OBSERVABILITY] Value Stream Fact Stream
CREATE OR REPLACE VIEW v4_l4.v_pulse_stream AS
SELECT 
    f.id,
    f.occurred_at,
    f.fact_type,
    wo.status as job_status,
    vs.name as stream_name,
    v4_l1.resolve_sovereign_root(f.node_id)->>'name' as sovereign_context,
    f.payload
FROM v4_l4.outbox_facts f
JOIN v4_l4.work_orders wo ON f.work_order_id = wo.id
JOIN v4_l4.value_streams vs ON wo.stream_id = vs.id;

GRANT SELECT ON v4_l4.v_pulse_stream TO authenticated;
GRANT EXECUTE ON FUNCTION v4_l4.rpc_provision_job TO authenticated;
GRANT EXECUTE ON FUNCTION v4_l4.rpc_pulse_job TO authenticated;
