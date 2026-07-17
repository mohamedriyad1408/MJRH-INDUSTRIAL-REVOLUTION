-- MJRH V4 — Layer 2: ACTOR CONTEXT RESOLVER (v1.0)
-- Purpose: Provide a unified view of an Actor's roles and authorities for the UI.

CREATE OR REPLACE FUNCTION v4_l2.fn_v_get_actor_roles(_actor_identity_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = v4_l2, v4_l1, public
AS $$
DECLARE
    _actor_id uuid;
    _root_id uuid;
    _roles text[];
    _authorities text[];
BEGIN
    -- 1. Find Actor
    SELECT id, sovereign_root_id INTO _actor_id, _root_id 
    FROM v4_l2.actors WHERE identity_id = _actor_identity_id LIMIT 1;
    
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'roles', '[]'::jsonb); END IF;

    -- 2. Aggregate Roles from Job Blueprints via Assignments
    SELECT array_agg(DISTINCT jb.code) INTO _roles
    FROM v4_l2.assignments a
    JOIN v4_l2.positions p ON a.position_id = p.id
    JOIN v4_l2.job_blueprints jb ON p.job_id = jb.id
    WHERE a.actor_id = _actor_id AND a.lifecycle_status = 'ACTIVE';

    -- 3. Aggregate Authority Classes
    SELECT array_agg(DISTINCT auth.authority_class) INTO _authorities
    FROM v4_l2.authorities auth
    JOIN v4_l2.assignments a ON auth.assignment_id = a.id
    WHERE a.actor_id = _actor_id AND a.lifecycle_status = 'ACTIVE' AND auth.is_active = true;

    RETURN jsonb_build_object(
        'ok', true,
        'actor_id', _actor_id,
        'root_id', _root_id,
        'roles', COALESCE(_roles, ARRAY[]::text[]),
        'authorities', COALESCE(_authorities, ARRAY[]::text[])
    );
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION v4_l2.fn_v_get_actor_roles TO authenticated;
