-- MJRH V4 — Layer 5: INTEGRITY & FORENSICS (v1.0)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- [ENGINE] Chain Integrity Verifier
-- Scans the ledger for a specific Sovereign Root and detects gaps or hash mismatches.
CREATE OR REPLACE FUNCTION v4_l5.fn_v_verify_chain_integrity(_sovereign_root_id uuid)
RETURNS TABLE (
    is_valid boolean,
    total_records bigint,
    tampered_at_id bigint,
    error_message text
) AS $$
DECLARE
    _r record;
    _calc_hash text;
    _last_hash text := 'MJRH_GENESIS';
BEGIN
    is_valid := true;
    total_records := 0;

    FOR _r IN 
        SELECT id, fact_payload, chain_hash 
        FROM v4_l5.evidence_ledger 
        WHERE sovereign_root_id = _sovereign_root_id 
        ORDER BY id ASC 
    LOOP
        total_records := total_records + 1;
        
        -- Compute expected hash: digest(prev + payload + id)
        _calc_hash := encode(digest(_last_hash || _r.fact_payload::text || _r.id::text, 'sha256'), 'hex');

        IF _calc_hash <> _r.chain_hash THEN
            is_valid := false;
            tampered_at_id := _r.id;
            error_message := 'Hash mismatch detected at record ' || _r.id;
            RETURN NEXT;
            RETURN;
        END IF;

        _last_hash := _r.chain_hash;
    END LOOP;

    IF total_records = 0 THEN
        error_message := 'No records found for sovereign root';
    END IF;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE;

-- [VIEW] The Audit Vault
-- Provides a clean, indexed view for auditors with L1 context resolution.
CREATE OR REPLACE VIEW v4_l5.v_audit_vault AS
SELECT 
    l.id,
    l.occurred_at,
    v4_l1.resolve_sovereign_root(l.sovereign_root_id)->>'name' as sovereign_identity,
    l.fact_type,
    l.fact_payload,
    l.pulse_version,
    l.chain_hash,
    a.type as actor_type,
    i.legal_name as actor_legal_name
FROM v4_l5.evidence_ledger l
JOIN v4_l2.actors a ON l.actor_id = a.id
JOIN v4_l1.identities i ON a.identity_id = i.id;

GRANT SELECT ON v4_l5.v_audit_vault TO authenticated;
