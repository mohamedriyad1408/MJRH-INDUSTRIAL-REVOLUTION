CREATE TABLE v4_l2.assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id uuid NOT NULL REFERENCES v4_l2.persons(id),
    position_id uuid NOT NULL REFERENCES v4_l2.positions(id),
    effective_from timestamptz NOT NULL DEFAULT now(),
    effective_to timestamptz,
    status v4_l2.assignment_status DEFAULT 'ACTIVE',
    version bigint NOT NULL DEFAULT 1,
    reason text,
    actor_id uuid, -- Reference to the person_id initiating the assignment
    created_at timestamptz DEFAULT now()
);

-- Prevent direct update on assignments to maintain history
CREATE OR REPLACE FUNCTION v4_l2.trg_fn_lock_assignment_history() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Only allow soft closing (effective_to or status change)
        -- Real updates must result in a new record
        IF OLD.person_id <> NEW.person_id OR OLD.position_id <> NEW.position_id THEN
            RAISE EXCEPTION 'IMMUTABLE_ASSIGNMENT: To reassign, close current and create new version.' USING ERRCODE = 'P1201';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assignment_immutability BEFORE UPDATE ON v4_l2.assignments
FOR EACH ROW EXECUTE FUNCTION v4_l2.trg_fn_lock_assignment_history();
