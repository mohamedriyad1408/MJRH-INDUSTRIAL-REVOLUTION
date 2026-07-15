CREATE TABLE v4_l2.assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id uuid NOT NULL REFERENCES v4_l2.persons(id),
    position_id uuid NOT NULL REFERENCES v4_l2.positions(id),
    organization_id uuid NOT NULL REFERENCES v4_l2.organizations(id),
    assignment_type v4_l2.assignment_type DEFAULT 'PRIMARY',
    lifecycle_status text NOT NULL DEFAULT 'ACTIVE',
    version bigint NOT NULL DEFAULT 1,
    effective_from timestamptz NOT NULL DEFAULT now(),
    effective_to timestamptz,
    reason text,
    actor_id uuid, -- Reference to person_id who made the change
    created_at timestamptz DEFAULT now()
);

-- One primary assignment constraint
CREATE UNIQUE INDEX idx_one_primary_per_org 
ON v4_l2.assignments (person_id, organization_id) 
WHERE (assignment_type = 'PRIMARY' AND lifecycle_status = 'ACTIVE');

-- Assignment Immutability Trigger
CREATE OR REPLACE FUNCTION v4_l2.trg_fn_assignments_versioning() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Only allow soft-closing or status update. Structural change requires NEW record.
        IF OLD.person_id <> NEW.person_id OR OLD.position_id <> NEW.position_id THEN
            RAISE EXCEPTION 'ASSIGNMENT_IMMUTABLE: Use new version for structural changes.' USING ERRCODE = 'P1201';
        END IF;
        NEW.version := OLD.version + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l2_assignments_guard BEFORE INSERT OR UPDATE ON v4_l2.assignments
FOR EACH ROW EXECUTE FUNCTION v4_l2.trg_fn_assignments_versioning();
