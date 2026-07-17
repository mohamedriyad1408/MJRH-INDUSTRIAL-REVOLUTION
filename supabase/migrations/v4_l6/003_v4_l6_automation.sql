-- MJRH V4 — Layer 6 Automation (v1.0)
-- Binds L4 state transitions to L6 awareness آلياً.

CREATE OR REPLACE FUNCTION v4_l6.trg_fn_trigger_observability()
RETURNS trigger
SET search_path = v4_l6, v4_l4, public
AS $$
BEGIN
    -- Only trigger on pulse events that mark activity changes
    IF NEW.fact_type = 'ACTIVITY_STARTED' THEN
        -- Asynchronous logic simulation: trigger SLA evaluation
        PERFORM v4_l6.fn_v_evaluate_pulse_sla(NEW.work_order_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l4_to_l6_pulse
AFTER INSERT ON v4_l4.outbox_facts
FOR EACH ROW EXECUTE FUNCTION v4_l6.trg_fn_trigger_observability();
