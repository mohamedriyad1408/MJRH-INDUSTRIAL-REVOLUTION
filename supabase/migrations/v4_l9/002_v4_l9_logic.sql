-- MJRH V4 — Layer 9: GATEWAY HARDENING & AUTOMATION (v1.0)
-- ARCHITECTURAL GRADE: EMBASSY-LEVEL SECURITY

-- [ENGINE] API Signature Verifier
-- Uses HMAC-SHA256 to verify inbound requests.
CREATE OR REPLACE FUNCTION v4_l9.fn_v_verify_api_signature(
    _api_key_prefix text,
    _payload text,
    _signature text
) RETURNS boolean
SET search_path = v4_l9, public
AS $$
DECLARE
    _key_secret text;
BEGIN
    -- 1. Fetch the hashed secret (In production, secrets are stored in Vault, here we use key_hash)
    SELECT key_hash INTO _key_secret FROM v4_l9.api_keys WHERE key_prefix = _api_key_prefix AND is_active = true;
    IF NOT FOUND THEN RETURN false; END IF;

    -- 2. Verify HMAC Signature
    -- signature = encode(hmac(_payload, _key_secret, 'sha256'), 'hex')
    RETURN _signature = encode(hmac(_payload, _key_secret, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql STABLE;

-- [ORCHESTRATOR] Webhook Propagator
-- Automatically schedules outbound webhooks when relevant facts occur in L4.
CREATE OR REPLACE FUNCTION v4_l9.fn_v_propagate_webhooks()
RETURNS trigger
SET search_path = v4_l9, v4_l4, public
AS $$
BEGIN
    -- Find all external systems interested in this type of fact for this node
    INSERT INTO v4_l9.webhook_logs (subscription_id, fact_id, request_payload)
    SELECT 
        s.id, 
        NEW.id, 
        jsonb_build_object(
            'event', NEW.fact_type,
            'node_id', NEW.node_id,
            'data', NEW.payload,
            'occurred_at', NEW.occurred_at
        )
    FROM v4_l9.webhook_subscriptions s
    WHERE s.node_id = NEW.node_id 
    AND s.fact_type = NEW.fact_type
    AND s.is_active = true;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind Gateway to L4 Pulse
CREATE TRIGGER trg_l4_to_l9_webhooks
AFTER INSERT ON v4_l4.outbox_facts
FOR EACH ROW EXECUTE FUNCTION v4_l9.fn_v_propagate_webhooks();

-- [RPC] Secure Inbound Signal (Hardened)
CREATE OR REPLACE FUNCTION v4_l9.rpc_submit_external_signal(
    _key_prefix text,
    _signature text,
    _capability_id text,
    _payload jsonb
) RETURNS jsonb
SECURITY DEFINER
SET search_path = v4_l9, v4_l4, v4_l1, public
AS $$
BEGIN
    -- 1. Hard Security Check
    IF NOT v4_l9.fn_v_verify_api_signature(_key_prefix, _payload::text, _signature) THEN
        RAISE EXCEPTION 'GATEWAY_SIGNATURE_MISMATCH' USING ERRCODE = 'P9001';
    END IF;

    -- 2. Process Signal
    RETURN v4_l9.fn_v_receive_signal(_key_prefix, _capability_id, _payload);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION v4_l9.rpc_submit_external_signal TO authenticated;
