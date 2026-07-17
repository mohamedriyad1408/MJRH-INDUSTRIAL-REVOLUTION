SET search_path = v4_l1, v4_l2, v4_l4, v4_l6, v4_l5, public;

-- Get the identity of the owner
WITH target_root AS (
    SELECT id, sovereign_owner_id FROM v4_l1.identities WHERE global_urn = 'urn:mjrh:dry-tech-cairo'
),
admin_actor AS (
    SELECT a.id as actor_id, a.identity_id 
    FROM v4_l2.actors a 
    JOIN target_root tr ON a.sovereign_root_id = (SELECT id FROM v4_l1.nodes WHERE identity_id = tr.id LIMIT 1)
    WHERE a.identity_id = tr.sovereign_owner_id
)
SELECT 
    'Mandate Check' as check_type,
    aa.actor_id,
    auth.authority_class,
    ass.lifecycle_status as assignment_status,
    auth.is_active as authority_active
FROM admin_actor aa
JOIN v4_l2.assignments ass ON ass.actor_id = aa.actor_id
JOIN v4_l2.authorities auth ON auth.assignment_id = ass.id
WHERE auth.authority_class = 'STRATEGIC_GOVERNANCE';

-- Check Work Orders count
SELECT 'Work Order Count' as check_type, count(*) FROM v4_l4.work_orders 
WHERE node_id = (SELECT id FROM v4_l1.nodes WHERE node_path = 'dry_tech_cairo' LIMIT 1);

-- Check Activities
SELECT 'Activity Icons' as check_type, name, sequence_order FROM v4_l4.activities 
WHERE stream_id = (SELECT id FROM v4_l4.value_streams WHERE sovereign_root_id = (SELECT id FROM v4_l1.nodes WHERE node_path = 'dry_tech_cairo' LIMIT 1) LIMIT 1);
