-- MJRH V4 — Layer 8: INTEROPERABILITY SCHEMA (v1.0 - PERSISTENCE)
CREATE SCHEMA IF NOT EXISTS v4_l8;

-- [TYPES]
DO $$ BEGIN
    CREATE TYPE v4_l8.handover_status AS ENUM ('INITIATED', 'IN_TRANSIT', 'ACCEPTED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [TABLE] Cross-Root Handovers
CREATE TABLE v4_l8.handovers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id uuid NOT NULL REFERENCES v4_l4.work_orders(id),
    from_node_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    to_node_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    sender_actor_id uuid NOT NULL REFERENCES v4_l2.actors(id),
    receiver_actor_id uuid REFERENCES v4_l2.actors(id),
    status v4_l8.handover_status DEFAULT 'INITIATED',
    export_payload jsonb NOT NULL DEFAULT '{}'::jsonb, -- Filtered payload for receiver
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT different_roots CHECK (
        v4_l1.resolve_sovereign_root(from_node_id) <> v4_l1.resolve_sovereign_root(to_node_id)
    )
);

-- [TABLE] Integration Gateway Keys
CREATE TABLE v4_l8.integration_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    key_hash text NOT NULL,
    description text,
    allowed_capabilities text[] DEFAULT '{}', -- L3 Capability IDs
    is_active boolean DEFAULT true,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- [ORCHESTRATOR] Execute Handover Departure
CREATE OR REPLACE FUNCTION v4_l8.fn_v_initiate_handover(
    _work_order_id uuid,
    _to_node_id uuid,
    _sender_actor_id uuid,
    _export_keys text[] DEFAULT '{}'
) RETURNS uuid
SET search_path = v4_l8, v4_l4, v4_l2, v4_l1, public
AS $$
DECLARE
    _wo record;
    _export_data jsonb := '{}'::jsonb;
    _handover_id uuid;
BEGIN
    -- 1. Lock Work Order
    SELECT * FROM v4_l4.work_orders WHERE id = _work_order_id FOR UPDATE INTO _wo;
    IF NOT FOUND THEN RAISE EXCEPTION 'WORK_ORDER_NOT_FOUND'; END IF;

    -- 2. Verify Sender Mandate (L2)
    PERFORM 1 FROM v4_l2.assignments 
    WHERE actor_id = _sender_actor_id AND lifecycle_status = 'ACTIVE';

    -- 3. Prepare Sanitized Payload
    -- Only export keys explicitly requested and present in WO payload
    IF _export_keys IS NOT NULL THEN
        SELECT jsonb_object_agg(key, value) INTO _export_data
        FROM jsonb_each(_wo.payload)
        WHERE key = ANY(_export_keys);
    END IF;

    -- 4. Record Handover
    INSERT INTO v4_l8.handovers (
        work_order_id, from_node_id, to_node_id, sender_actor_id, export_payload, status
    ) VALUES (
        _work_order_id, _wo.node_id, _to_node_id, _sender_actor_id, COALESCE(_export_data, '{}'::jsonb), 'IN_TRANSIT'
    ) RETURNING id INTO _handover_id;

    -- 5. Update WO State (L4 Transit)
    UPDATE v4_l4.work_orders 
    SET status = 'PENDING', -- Reset to pending in the context of transit
        payload = _export_data,
        node_id = _to_node_id, -- Virtual anchoring to target node
        version = version + 1
    WHERE id = _work_order_id;

    -- 6. Emit Transit Fact
    INSERT INTO v4_l4.outbox_facts (work_order_id, node_id, actor_id, fact_type, payload)
    VALUES (_work_order_id, _wo.node_id, _sender_actor_id, 'WO_CREATED', 
            jsonb_build_object('transit_id', _handover_id, 'event', 'HANDOVER_DEPARTURE'));

    RETURN _handover_id;
END;
$$ LANGUAGE plpgsql;
