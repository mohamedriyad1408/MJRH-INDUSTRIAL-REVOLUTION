-- MJRH V4 — Layer 2: Delegation Engine (v1.0 Hardened)
CREATE TABLE v4_l2.delegations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_assignment_id uuid NOT NULL REFERENCES v4_l2.assignments(id),
    to_assignment_id uuid NOT NULL REFERENCES v4_l2.assignments(id),
    authority_id uuid NOT NULL REFERENCES v4_l2.authorities(id),
    valid_range tstzrange NOT NULL,
    is_revoked boolean DEFAULT false,
    revocation_reason text,
    created_at timestamptz DEFAULT now()
);

-- RECURSIVE REVOCATION GUARD
CREATE OR REPLACE FUNCTION v4_l2.fn_cascade_delegation_revocation() RETURNS trigger 
SET search_path = v4_l2, v4_l1, public AS $$
BEGIN
    IF NEW.lifecycle_status IN ('SUSPENDED', 'ARCHIVED') THEN
        UPDATE v4_l2.delegations 
        SET is_revoked = true, revocation_reason = 'PARENT_ASSIGNMENT_TERMINATED'
        WHERE from_assignment_id = NEW.id AND is_revoked = false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l2_assignments_revocation AFTER UPDATE OF lifecycle_status ON v4_l2.assignments
FOR EACH ROW EXECUTE FUNCTION v4_l2.fn_cascade_delegation_revocation();
