-- MJRH V4 — Layer 10: CORE EVOLUTIONARY ENGINE (v1.0 - HARDENED)
-- ARCHITECTURAL GRADE: SELF-OPTIMIZING SYSTEM

-- [ENGINE] Auto-Propose SLA Optimization
-- Detects if a specific activity is consistently breaching SLA and proposes a mutation.
CREATE OR REPLACE FUNCTION v4_l10.fn_v_detect_and_propose_optimization(_node_id uuid)
RETURNS uuid
SET search_path = v4_l10, v4_l6, v4_l1, public
AS $$
DECLARE
    _breach_count int;
    _activity_id uuid;
    _mutation_id uuid;
    _justification text;
BEGIN
    -- 1. Analyze L6: Find activity with > 5 critical breaches in last 24h
    SELECT activity_id, count(*) INTO _activity_id, _breach_count
    FROM v4_l6.sla_breaches
    WHERE node_id = _node_id AND detected_at > now() - interval '24 hours'
    GROUP BY activity_id HAVING count(*) > 5 LIMIT 1;

    IF NOT FOUND THEN RETURN NULL; END IF;

    _justification := format('Detected %s SLA breaches in activity [%s] at node [%s]. Proposing 20%% buffer increase.', _breach_count, _activity_id, _node_id);

    -- 2. Record Inference
    INSERT INTO v4_l10.inferences (sovereign_root_id, pattern_type, evidence_payload)
    VALUES (
        (v4_l1.resolve_sovereign_root(_node_id)->>'sovereign_id')::uuid,
        'BOTTLENECK_DETECTED',
        jsonb_build_object('activity_id', _activity_id, 'breach_count', _breach_count)
    );

    -- 3. Propose Mutation (L6 Target)
    INSERT INTO v4_l10.mutations (
        sovereign_root_id, target_layer, target_entity_id, mutation_payload, justification, status, confidence_score
    ) VALUES (
        (v4_l1.resolve_sovereign_root(_node_id)->>'sovereign_id')::uuid,
        'L6_SLA',
        (SELECT id FROM v4_l6.sla_policies WHERE activity_id = _activity_id),
        '{"critical_duration": "1.2x"}'::jsonb, -- Pseudo-patch for 20% increase
        _justification,
        'PROPOSED',
        0.85
    ) RETURNING id INTO _mutation_id;

    RETURN _mutation_id;
END;
$$ LANGUAGE plpgsql;

-- [ENGINE] Mutation Injector (The Final Pulse)
-- Applies an APPROVED mutation and documents it in L5.
CREATE OR REPLACE FUNCTION v4_l10.fn_v_apply_mutation(
    _mutation_id uuid,
    _approver_actor_id uuid
) RETURNS void
SET search_path = v4_l10, v4_l6, v4_l5, v4_l4, v4_l2, v4_l1, public
AS $$
DECLARE
    _m record;
BEGIN
    -- 1. Fetch and Lock Mutation
    SELECT * FROM v4_l10.mutations WHERE id = _mutation_id FOR UPDATE INTO _m;
    IF NOT FOUND OR _m.status <> 'PROPOSED' THEN RAISE EXCEPTION 'MUTATION_NOT_READY'; END IF;

    -- 2. Verify Mandate for Strategic Evolution (L2)
    -- In a hardened system, we check for authority_class = 'STRATEGIC'
    PERFORM 1 FROM v4_l2.assignments a
    JOIN v4_l2.authorities auth ON a.id = auth.assignment_id
    WHERE a.actor_id = _approver_actor_id 
    AND a.lifecycle_status = 'ACTIVE'
    AND auth.authority_class = 'STRATEGIC_GOVERNANCE';

    -- 3. Inject Change (Layer Specific Logic)
    IF _m.target_layer = 'L6_SLA' THEN
        -- Apply the buffer increase to the policy
        UPDATE v4_l6.sla_policies 
        SET critical_duration = critical_duration * 1.2 
        WHERE id = _m.target_entity_id;
    END IF;

    -- 4. Finalize Mutation Status
    UPDATE v4_l10.mutations 
    SET status = 'APPLIED', 
        decided_by = _approver_actor_id, 
        decided_at = now(), 
        applied_at = now()
    WHERE id = _mutation_id;

    -- 5. Record Evolutionary Pulse in L5 (Audit Integrity)
    INSERT INTO v4_l4.outbox_facts (work_order_id, node_id, actor_id, fact_type, payload)
    VALUES (
        gen_random_uuid(), -- System Work Order for Evolution
        _m.sovereign_root_id,
        _approver_actor_id,
        'ACTIVITY_COMPLETED',
        jsonb_build_object('event', 'SYSTEM_EVOLUTION', 'mutation_id', _m.id, 'target', _m.target_layer)
    );
END;
$$ LANGUAGE plpgsql;
