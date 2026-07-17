-- MJRH V4 — THE BIG BANG SIMULATION (FULL STACK INTEGRATION TEST)
-- VERIFYING LAYERS 1-10 IN A SINGLE SOVEREIGN CONTEXT

BEGIN;

-- [PRE-REQUISITE] Set Sovereign Identity Context
SET LOCAL app.current_sovereign_label = '_root';

-- [L1] CREATE SOVEREIGN STRUCTURE
-- Creating "Grand Hotel Group" Holding
INSERT INTO v4_l1.identities (id, global_urn, legal_name, is_sovereign_root)
VALUES ('10000000-0000-4000-a000-000000000000', 'urn:mjrh:grand_hotel', 'Grand Hotel Group Holding', true);

INSERT INTO v4_l1.nodes (id, identity_id, node_class, node_path)
VALUES ('11000000-0000-4000-a000-000000000000', '10000000-0000-4000-a000-000000000000', 'SOVEREIGN_ROOT', '_root');

-- [L2] ESTABLISH ACTOR & MANDATE
INSERT INTO v4_l1.identities (id, global_urn, legal_name)
VALUES ('20000000-0000-4000-a000-000000000000', 'urn:mjrh:ceo_smith', 'John Smith (CEO)');

INSERT INTO v4_l2.actors (id, identity_id, type, sovereign_root_id)
VALUES ('21000000-0000-4000-a000-000000000000', '20000000-0000-4000-a000-000000000000', 'HUMAN', '11000000-0000-4000-a000-000000000000');

INSERT INTO v4_l2.job_blueprints (id, code, title_ar, title_en)
VALUES ('22000000-0000-4000-a000-000000000000', 'CEO', 'الرئيس التنفيذي', 'Chief Executive Officer');

INSERT INTO v4_l2.positions (id, node_id, job_id)
VALUES ('23000000-0000-4000-a000-000000000000', '11000000-0000-4000-a000-000000000000', '22000000-0000-4000-a000-000000000000');

INSERT INTO v4_l2.assignments (actor_id, position_id, effective_range)
VALUES ('21000000-0000-4000-a000-000000000000', '23000000-0000-4000-a000-000000000000', tstzrange(now(), 'infinity'));

INSERT INTO v4_l2.authorities (assignment_id, domain, authority_class)
VALUES ((SELECT id FROM v4_l2.assignments LIMIT 1), 'OPERATIONAL', 'ADMIN_ACCESS');

-- [L3] PROVISION CAPABILITY
INSERT INTO v4_l3.capability_instances (id, definition_id, org_node_id, is_active)
VALUES ('31000000-0000-4000-a000-000000000000', gen_random_uuid(), '11000000-0000-4000-a000-000000000000', true);

-- [L4] DEFINE VALUE STREAM & PROVISION JOB
INSERT INTO v4_l4.value_streams (id, sovereign_root_id, name)
VALUES ('41000000-0000-4000-a000-000000000000', '11000000-0000-4000-a000-000000000000', 'Laundry Stream');

INSERT INTO v4_l4.activities (id, stream_id, name, sequence_order, mandate_required)
VALUES 
('42000000-0000-4000-a000-000000000001', '41000000-0000-4000-a000-000000000000', 'Intake', 1, 'ADMIN_ACCESS'),
('42000000-0000-4000-a000-000000000002', '41000000-0000-4000-a000-000000000000', 'Processing', 2, 'ADMIN_ACCESS');

SELECT v4_l4.fn_provision_work_order(
    '11000000-0000-4000-a000-000000000000',
    '41000000-0000-4000-a000-000000000000',
    '21000000-0000-4000-a000-000000000000'
) AS initial_job_id;

-- [L5/L6] EXECUTE PULSE & VERIFY LEDGER/SLA
SELECT v4_l4.fn_execute_pulse(
    (SELECT id FROM v4_l4.work_orders LIMIT 1),
    '42000000-0000-4000-a000-000000000002',
    '21000000-0000-4000-a000-000000000000'
) AS pulse_result;

-- [L7] FETCH DYNAMIC UI CONTEXT
SELECT v4_l7.fn_v_get_ui_metadata(
    (SELECT id FROM v4_l4.work_orders LIMIT 1),
    '21000000-0000-4000-a000-000000000000'
) AS ui_metadata;

-- [L10] CHECK FOR INFERENCES (The System Brain check)
SELECT * FROM v4_l10.inferences;

-- FINAL VERIFICATION
SELECT 'SUCCESS' as result, COUNT(*) as facts_in_ledger FROM v4_l5.evidence_ledger;

ROLLBACK; -- Protect development state
