-- MJRH V4 — Layer 9: GATEWAY SCHEMA (v1.0 - PERSISTENCE)
CREATE SCHEMA IF NOT EXISTS v4_l9;

-- [TABLE] External API Keys
-- Managed by Sovereign Roots for specific operational nodes.
CREATE TABLE v4_l9.api_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    key_name text NOT NULL,
    key_prefix text NOT NULL UNIQUE, -- Visible part for lookup
    key_hash text NOT NULL, -- Cryptographic hash of the secret
    allowed_capabilities text[] DEFAULT '{}', -- Whitelist of L3 Capability IDs
    is_active boolean DEFAULT true,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now(),
    last_used_at timestamptz
);

-- [TABLE] Webhook Subscriptions
-- How external systems "listen" to the OS Pulse.
CREATE TABLE v4_l9.webhook_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    fact_type v4_l4.fact_type NOT NULL,
    target_url text NOT NULL,
    secret_token text, -- For signing outbound payloads
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- [TABLE] Outbound Webhook Logs
-- The evidence of communication with the outside world.
CREATE TABLE v4_l9.webhook_logs (
    id bigserial PRIMARY KEY,
    subscription_id uuid NOT NULL REFERENCES v4_l9.webhook_subscriptions(id),
    fact_id bigint NOT NULL REFERENCES v4_l4.outbox_facts(id),
    request_payload jsonb,
    response_status int,
    attempt_count int DEFAULT 1,
    sent_at timestamptz DEFAULT now()
);

-- [ORCHESTRATOR] Inbound Signal Receiver
-- Maps an external request to a Layer 4 Work Order creation or Pulse.
CREATE OR REPLACE FUNCTION v4_l9.fn_v_receive_signal(
    _api_key_prefix text,
    _capability_id text,
    _payload jsonb,
    _trace_id uuid DEFAULT gen_random_uuid()
) RETURNS jsonb
SET search_path = v4_l9, v4_l4, v4_l3, v4_l1, public
AS $$
DECLARE
    _key record;
    _wo_id uuid;
BEGIN
    -- 1. Resolve and Validate Key
    SELECT * FROM v4_l9.api_keys 
    WHERE key_prefix = _api_key_prefix AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
    INTO _key;

    IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_GATEWAY_KEY'; END IF;

    -- 2. Verify Capability Mapping (L3)
    IF NOT (_capability_id = ANY(_key.allowed_capabilities)) THEN
        RAISE EXCEPTION 'KEY_NOT_AUTHORIZED_FOR_CAPABILITY [%]', _capability_id;
    END IF;

    -- 3. Execute L4 Pulse (Inbound context uses a Synthetic Actor ID for the node)
    -- We assume each integration key maps to a 'Service Actor' or 'System Actor'
    -- For v1, we provision a work order or pulse an existing one.
    -- (Logic simplified for schema initialization)
    
    INSERT INTO v4_l4.outbox_facts (work_order_id, node_id, fact_type, payload)
    VALUES (gen_random_uuid(), _key.node_id, 'WO_CREATED', 
            _payload || jsonb_build_object('gateway_trace_id', _trace_id, 'source', _key.key_name));

    RETURN jsonb_build_object('ok', true, 'trace_id', _trace_id, 'node_id', _key.node_id);
END;
$$ LANGUAGE plpgsql;

-- [INDEXES]
CREATE INDEX idx_keys_node ON v4_l9.api_keys(node_id);
CREATE INDEX idx_webhooks_node ON v4_l9.webhook_subscriptions(node_id, fact_type);
