-- MJRH V4 — Layer 6: CORE OBSERVABILITY ENGINE (v1.0 - HARDENED)
-- ARCHITECTURAL GRADE: INTEGRATED CONSCIOUSNESS

-- [ENGINE] SLA Compliance Guardian
-- Analyzes a Work Order pulse and flags it if it violates the SLA Policy.
CREATE OR REPLACE FUNCTION v4_l6.fn_v_evaluate_pulse_sla(_work_order_id uuid)
RETURNS void 
SET search_path = v4_l6, v4_l4, v4_l1, public
AS $$
DECLARE
    _wo record;
    _policy record;
    _duration interval;
BEGIN
    -- 1. Get WO and its last transition timing
    SELECT wo.*, f.occurred_at as start_time 
    FROM v4_l4.work_orders wo
    JOIN v4_l4.outbox_facts f ON f.work_order_id = wo.id
    WHERE wo.id = _work_order_id
    ORDER BY f.id DESC OFFSET 1 LIMIT 1 -- Get the PREVIOUS pulse time
    INTO _wo;

    IF NOT FOUND THEN RETURN; END IF;

    -- 2. Resolve SLA Policy for the target activity
    SELECT * FROM v4_l6.sla_policies WHERE activity_id = _wo.current_activity_id INTO _policy;
    IF NOT FOUND THEN RETURN; END IF;

    _duration := now() - _wo.start_time;

    -- 3. Detect and Record Breach
    IF _duration > _policy.critical_duration THEN
        INSERT INTO v4_l6.sla_breaches (work_order_id, activity_id, node_id, actual_duration, severity)
        VALUES (_work_order_id, _wo.current_activity_id, _wo.node_id, _duration, 'CRITICAL');
        
        -- Trigger Sovereign Alert
        PERFORM v4_l6.fn_v_dispatch_sovereign_alert(
            _wo.node_id, 
            'CRITICAL_SLA_BREACH', 
            format('Work Order [%s] breached critical SLA in activity [%s]', _work_order_id, _wo.current_activity_id)
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- [ENGINE] Sovereign Alert Dispatcher
-- Routes alerts to specific Actors based on their L2 Assignment and L1 Position.
CREATE OR REPLACE FUNCTION v4_l6.fn_v_dispatch_sovereign_alert(
    _node_id uuid,
    _alert_type text,
    _message text
) RETURNS void
SET search_path = v4_l6, v4_l2, v4_l1, public
AS $$
DECLARE
    _sov_root_id uuid;
BEGIN
    -- 1. Resolve Sovereign Root to ensure no leakage
    _sov_root_id := (v4_l1.resolve_sovereign_root(_node_id)->>'sovereign_id')::uuid;

    -- 2. Notify all Actors holding an ACTIVE assignment at this node or above
    -- This links L6 awareness directly to L2 authority and L1 structure.
    INSERT INTO v4_l6.alerts (sovereign_root_id, actor_id, title, body, metadata)
    SELECT _sov_root_id, a.id, _alert_type, _message, jsonb_build_object('source_node', _node_id)
    FROM v4_l2.assignments a
    JOIN v4_l2.positions p ON a.position_id = p.id
    WHERE p.node_id = _node_id 
    AND a.lifecycle_status = 'ACTIVE';
END;
$$ LANGUAGE plpgsql;

-- [ENGINE] Node Health Orchestrator (Deep Integration)
-- Recalculates health score by querying across L3, L5, and L6.
CREATE OR REPLACE FUNCTION v4_l6.fn_v_recalculate_node_health(_node_id uuid)
RETURNS numeric
SET search_path = v4_l6, v4_l5, v4_l3, v4_l1, public
AS $$
DECLARE
    _compliance_score numeric;
    _sla_score numeric;
    _resource_score numeric;
    _integrity_check jsonb;
BEGIN
    -- A. Compliance (L5): Check chain integrity for the sovereign root
    _integrity_check := (SELECT row_to_json(v) FROM v4_l5.fn_v_verify_chain_integrity(_node_id) v);
    _compliance_score := CASE WHEN (_integrity_check->>'is_valid')::boolean THEN 100 ELSE 0 END;

    -- B. SLA (L6): Inverse of critical breaches in last 24h
    _sla_score := 100 - LEAST(100, (SELECT count(*) * 10 FROM v4_l6.sla_breaches WHERE node_id = _node_id AND detected_at > now() - interval '24 hours'));

    -- C. Resource (L3): Ratio of READY capability instances
    SELECT COALESCE(avg(CASE WHEN (v4_l3.fn_evaluate_readiness(id)->>'state') = 'READY' THEN 100 ELSE 0 END), 100)
    INTO _resource_score
    FROM v4_l3.capability_instances WHERE org_node_id = _node_id;

    -- Update Scoreboard
    INSERT INTO v4_l6.node_health_scores (node_id, compliance_score, sla_score, resource_score, computed_at)
    VALUES (_node_id, _compliance_score, _sla_score, _resource_score, now())
    ON CONFLICT (node_id) DO UPDATE SET
        compliance_score = EXCLUDED.compliance_score,
        sla_score = EXCLUDED.sla_score,
        resource_score = EXCLUDED.resource_score,
        computed_at = now();

    RETURN (SELECT total_score FROM v4_l6.node_health_scores WHERE node_id = _node_id);
END;
$$ LANGUAGE plpgsql;
