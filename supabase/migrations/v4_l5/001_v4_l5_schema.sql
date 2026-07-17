-- MJRH V4 — Layer 5: EVIDENCE LEDGER (v1.0 - PERSISTENCE)
CREATE SCHEMA IF NOT EXISTS v4_l5;

-- [TABLE] The Immutable Evidence Ledger
-- This table is designed to be partitioned in production.
CREATE TABLE v4_l5.evidence_ledger (
    id bigserial PRIMARY KEY,
    sovereign_root_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    work_order_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    fact_type text NOT NULL,
    fact_payload jsonb NOT NULL,
    pulse_version bigint NOT NULL,
    chain_hash text NOT NULL, -- SHA-256 for cryptographic integrity
    occurred_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- [VALIDATOR] Immutability Trigger
CREATE OR REPLACE FUNCTION v4_l5.fn_v_ledger_immutability() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'CRITICAL: IMMUTABILITY_VIOLATION. Evidence Ledger cannot be updated or deleted.'
    USING ERRCODE = 'P4001';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l5_immutability
BEFORE UPDATE OR DELETE ON v4_l5.evidence_ledger
FOR EACH ROW EXECUTE FUNCTION v4_l5.fn_v_ledger_immutability();

-- [ORCHESTRATOR] Evidence Capture (from L4 Outbox)
CREATE OR REPLACE FUNCTION v4_l5.fn_capture_evidence() RETURNS trigger AS $$
DECLARE
    _prev_hash text;
    _current_hash text;
BEGIN
    -- 1. Resolve Previous Hash for this Sovereign Root
    SELECT chain_hash FROM v4_l5.evidence_ledger 
    WHERE sovereign_root_id = NEW.node_id -- node_id in outbox maps to L1 node
    ORDER BY id DESC LIMIT 1 INTO _prev_hash;
    
    _prev_hash := COALESCE(_prev_hash, 'MJRH_GENESIS');

    -- 2. Compute SHA-256 (Simplified for SQL implementation)
    -- In production, this would use a dedicated crypto extension or library.
    _current_hash := encode(digest(_prev_hash || NEW.payload::text || NEW.id::text, 'sha256'), 'hex');

    -- 3. Insert into Permanent Ledger
    INSERT INTO v4_l5.evidence_ledger (
        sovereign_root_id, work_order_id, actor_id, fact_type, fact_payload, 
        pulse_version, chain_hash, occurred_at
    ) VALUES (
        NEW.node_id, NEW.work_order_id, NEW.actor_id, NEW.fact_type::text, 
        NEW.payload, 1, -- pulse_version would be derived from payload if needed
        _current_hash, NEW.occurred_at
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Hook into L4 Outbox to automatically capture evidence
CREATE TRIGGER trg_l4_fact_capture
AFTER INSERT ON v4_l4.outbox_facts
FOR EACH ROW EXECUTE FUNCTION v4_l5.fn_capture_evidence();

-- [INDEXES]
CREATE INDEX idx_ledger_sovereign ON v4_l5.evidence_ledger(sovereign_root_id);
CREATE INDEX idx_ledger_wo ON v4_l5.evidence_ledger(work_order_id);
CREATE INDEX idx_ledger_time ON v4_l5.evidence_ledger(occurred_at DESC);
