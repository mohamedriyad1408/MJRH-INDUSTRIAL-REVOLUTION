-- [ORCHESTRATION: The Governance Pulse]
CREATE OR REPLACE FUNCTION v4_l2.trg_l2_assignment_pulse() RETURNS trigger 
SET search_path = v4_l2, v4_l1, public AS $$
DECLARE
    _actor_sov uuid;
    _pos_sov uuid;
BEGIN
    -- 1. Locking
    PERFORM 1 FROM actors WHERE id = NEW.actor_id FOR UPDATE;
    PERFORM 1 FROM positions WHERE id = NEW.position_id FOR UPDATE;

    -- 2. State Machine Check
    IF TG_OP = 'UPDATE' AND NOT v4_l2.fn_validate_legal_transition(OLD.lifecycle_status, NEW.lifecycle_status) THEN
        RAISE EXCEPTION 'ILLEGAL_STATE_TRANSITION' USING ERRCODE = 'P1203';
    END IF;

    -- 3. Sovereign Boundary Enforcement
    SELECT sovereign_root_id INTO _actor_sov FROM actors WHERE id = NEW.actor_id;
    SELECT sovereign_root_id INTO _pos_sov FROM positions WHERE id = NEW.position_id;
    IF _actor_sov <> _pos_sov THEN RAISE EXCEPTION 'SOVEREIGN_BOUNDARY_VIOLATION' USING ERRCODE = 'P1202'; END IF;

    -- 4. Cryptographic Chaining
    IF TG_OP = 'INSERT' THEN
        NEW.digest := v4_l2.fn_generate_assignment_digest(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        -- Force immutability of structural fields
        IF OLD.actor_id <> NEW.actor_id OR OLD.position_id <> NEW.position_id THEN
            RAISE EXCEPTION 'IMMUTABLE_ASSIGNMENT' USING ERRCODE = 'P1201';
        END IF;
        NEW.version := OLD.version + 1;
        NEW.prev_digest := OLD.digest;
        NEW.digest := v4_l2.fn_generate_assignment_digest(NEW);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l2_assignment_before BEFORE INSERT OR UPDATE ON v4_l2.assignments
FOR EACH ROW EXECUTE FUNCTION v4_l2.trg_l2_assignment_pulse();

-- 5. Delete Guard
CREATE OR REPLACE FUNCTION v4_l2.fn_prevent_legal_deletion() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'PHYSICAL_DELETE_FORBIDDEN: Use ARCHIVED state for legal records.' USING ERRCODE = 'P1204';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l2_no_delete BEFORE DELETE ON v4_l2.assignments FOR EACH ROW EXECUTE FUNCTION v4_l2.fn_prevent_legal_deletion();
