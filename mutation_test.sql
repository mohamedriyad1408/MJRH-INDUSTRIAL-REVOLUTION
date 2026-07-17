BEGIN;
-- Simulation of Super Admin proposing a change
SET LOCAL app.current_sovereign_label = 'dry_tech_cairo';

-- Identify the Activity 'WASH'
DO $$
DECLARE
    _target_id uuid;
    _actor_id uuid;
    _mutation_id uuid;
BEGIN
    SELECT id INTO _target_id FROM v4_l4.activities WHERE name = 'WASH' LIMIT 1;
    SELECT id INTO _actor_id FROM v4_l2.actors WHERE identity_id = (SELECT sovereign_owner_id FROM v4_l1.identities WHERE global_urn = 'urn:mjrh:dry-tech-cairo') LIMIT 1;

    -- Step 1: Propose Name Change via L10
    INSERT INTO v4_l10.mutations (sovereign_root_id, target_layer, target_entity_id, mutation_payload, justification, status)
    VALUES (
        (SELECT id FROM v4_l1.nodes WHERE node_path = 'dry_tech_cairo' LIMIT 1),
        'L4_BLUEPRINT',
        _target_id,
        '{"name": "WASHING"}'::jsonb,
        'Branding update for better clarity',
        'PROPOSED'
    ) RETURNING id INTO _mutation_id;

    -- Step 2: Apply Mutation (Verify L2 check)
    PERFORM v4_l10.fn_v_apply_mutation(_mutation_id, _actor_id);
    
    RAISE NOTICE 'SUCCESS: Mutation applied. Activity name updated.';
END $$;

-- Verify change
SELECT name FROM v4_l4.activities WHERE name = 'WASHING';

ROLLBACK; -- Standard protocol for verification
