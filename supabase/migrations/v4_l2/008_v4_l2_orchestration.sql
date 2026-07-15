-- MJRH V4 — Layer 2: Legal Orchestrator (The Guard)
CREATE OR REPLACE FUNCTION v4_l2.fn_l2_assignment_guard() RETURNS trigger 
SET search_path = v4_l2, v4_l1, public AS $$
DECLARE
    _actor_sov uuid;
    _pos_sov uuid;
BEGIN
    -- 1. Atomic Locking to prevent races
    PERFORM 1 FROM actors WHERE id = NEW.actor_id FOR UPDATE;
    PERFORM 1 FROM positions WHERE id = NEW.position_id FOR UPDATE;

    -- 2. Sovereign Integrity Verification
    SELECT sovereign_root_id INTO _actor_sov FROM actors WHERE id = NEW.actor_id;
    SELECT sovereign_root_id INTO _pos_sov FROM positions WHERE id = NEW.position_id;

    IF _actor_sov <> _pos_sov THEN
        RAISE EXCEPTION 'SOVEREIGN_BOUNDARY_VIOLATION: Actor and Position must share the same Sovereign Root.' USING ERRCODE = 'P1202';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l2_assignment_before BEFORE INSERT OR UPDATE ON v4_l2.assignments
FOR EACH ROW EXECUTE FUNCTION v4_l2.fn_l2_assignment_guard();
