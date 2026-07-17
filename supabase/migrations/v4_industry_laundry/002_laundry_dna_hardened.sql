-- MJRH V4 — INDUSTRIAL DNA: HARDENED LAUNDRY TEMPLATE (v1.1)
-- ARCHITECTURAL GRADE: SOVEREIGN (NO COMPROMISES)

-- 1. [L1] CREATE INDUSTRY TEMPLATE SCHEMA
CREATE SCHEMA IF NOT EXISTS v4_industry;

-- [TABLE] Industry Blueprint Registry
-- Stores generic industry templates to prevent cross-root pollution.
CREATE TABLE IF NOT EXISTS v4_industry.laundry_template (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    value_stream_config jsonb NOT NULL, -- Defines activities and sequence
    capability_requirements jsonb NOT NULL, -- Defines resource types
    created_at timestamptz DEFAULT now()
);

-- 2. SEED THE HARDENED TEMPLATE
INSERT INTO v4_industry.laundry_template (name, value_stream_config, capability_requirements)
VALUES (
    'Industrial Laundry v1',
    '{
        "activities": [
            {"name": "RECEIVE", "order": 10, "mandate": "OPERATIONAL_ENTRY"},
            {"name": "WASH", "order": 20, "mandate": "OPERATIONAL_EXEC"},
            {"name": "DRY", "order": 30, "mandate": "OPERATIONAL_EXEC"},
            {"name": "IRON", "order": 40, "mandate": "OPERATIONAL_EXEC"},
            {"name": "PACKAGING", "order": 50, "mandate": "OPERATIONAL_EXEC"},
            {"name": "DELIVERY", "order": 60, "mandate": "OPERATIONAL_EXIT"}
        ]
    }'::jsonb,
    '[
        {"resource_type": "Human", "weight": 0.6},
        {"resource_type": "Machine", "weight": 0.4}
    ]'::jsonb
) ON CONFLICT DO NOTHING;

-- 3. [L5] HARDENED FINANCIAL TRIGGER (SOVEREIGN CURRENCY AWARE)
CREATE OR REPLACE FUNCTION v4_l5.fn_v_trigger_laundry_financials()
RETURNS trigger
SET search_path = v4_l5, v4_l4, v4_l2, v4_l1, public
AS $$
DECLARE
    _currency text;
    _activity_name text;
BEGIN
    -- Resolve Currency from Node Metadata (Default: EGP)
    SELECT COALESCE(metadata->>'currency', 'EGP') INTO _currency
    FROM v4_l1.nodes WHERE id = NEW.node_id;

    -- Get Activity Name
    SELECT name INTO _activity_name FROM v4_l4.activities WHERE id = NEW.current_activity_id;

    -- Atomic Financial Handshake Invariant (DNA-G-001)
    IF _activity_name = 'DELIVERY' THEN
        INSERT INTO v4_l4.outbox_facts (work_order_id, node_id, actor_id, fact_type, payload)
        VALUES (
            NEW.id, 
            NEW.node_id, 
            NEW.actor_id, 
            'ACTIVITY_COMPLETED', 
            jsonb_build_object(
                'event', 'FINANCIAL_RECOGNITION',
                'amount', NEW.payload->>'total_amount',
                'currency', _currency,
                'action', 'REVENUE_ACCRUAL',
                'dna_ref', 'G-001'
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-bind the trigger
DROP TRIGGER IF EXISTS trg_l5_laundry_financials ON v4_l4.work_orders;
CREATE TRIGGER trg_l5_laundry_financials
AFTER UPDATE OF current_activity_id ON v4_l4.work_orders
FOR EACH ROW EXECUTE FUNCTION v4_l5.fn_v_trigger_laundry_financials();

-- 4. [L6] SOVEREIGN LOAD BALANCER (ISOLATED TO NODE)
CREATE OR REPLACE FUNCTION v4_l6.fn_v_balance_workload(_node_id uuid)
RETURNS void
SET search_path = v4_l10, v4_l6, v4_l4, public
AS $$
DECLARE
    _avg_load numeric;
    _overloaded_actor record;
BEGIN
    -- FIX: Strict Sovereign Isolation. Average is calculated ONLY for this node.
    SELECT avg(count_tasks) INTO _avg_load
    FROM (
        SELECT actor_id, count(*) as count_tasks 
        FROM v4_l4.work_orders 
        WHERE node_id = _node_id AND status = 'RUNNING'
        GROUP BY actor_id
    ) sub;

    -- Propose redistribution mutations for actors exceeding 150% of node average
    FOR _overloaded_actor IN 
        SELECT actor_id, count(*) as count_tasks 
        FROM v4_l4.work_orders 
        WHERE node_id = _node_id AND status = 'RUNNING'
        GROUP BY actor_id HAVING count(*) > (COALESCE(_avg_load, 0) * 1.5)
    LOOP
        INSERT INTO v4_l10.mutations (
            sovereign_root_id, target_layer, target_entity_id, mutation_payload, justification, status
        ) VALUES (
            (SELECT subltree(node_path, 0, 1)::text::uuid FROM v4_l1.nodes WHERE id = _node_id), -- Resolve Root
            'L3_CAPACITY',
            _overloaded_actor.actor_id,
            jsonb_build_object('action', 'REDISTRIBUTE_LOAD', 'node_id', _node_id),
            'Sovereign Balancer (G-002) detected load imbalance.',
            'PROPOSED'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;
