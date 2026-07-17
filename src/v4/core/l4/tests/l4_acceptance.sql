-- MJRH V4 — Layer 4 Acceptance Test
-- Scenario: Successful Value Stream Provisioning and Pulse Transition.

BEGIN;

-- 1. Setup Mock Context (Admin Actor in Sovereign Root)
SET LOCAL app.current_sovereign_label = '_root';

-- 2. Create Value Stream
INSERT INTO v4_l4.value_streams (id, sovereign_root_id, name)
VALUES ('00000000-0000-4000-a000-000000000001', (SELECT id FROM v4_l1.nodes WHERE node_path = '_root' LIMIT 1), 'Acceptance Stream');

-- 3. Create Activities
INSERT INTO v4_l4.activities (id, stream_id, name, sequence_order)
VALUES 
('00000000-0000-4000-a000-000000000011', '00000000-0000-4000-a000-000000000001', 'Start', 10),
('00000000-0000-4000-a000-000000000012', '00000000-0000-4000-a000-000000000001', 'Middle', 20);

-- 4. Test Provisioning
SELECT v4_l4.fn_provision_work_order(
    (SELECT id FROM v4_l1.nodes WHERE node_path = '_root' LIMIT 1),
    '00000000-0000-4000-a000-000000000001',
    (SELECT id FROM v4_l2.actors LIMIT 1)
) AS test_wo_id;

-- 5. Test Pulse
SELECT v4_l4.fn_execute_pulse(
    (SELECT id FROM v4_l4.work_orders LIMIT 1),
    '00000000-0000-4000-a000-000000000012',
    (SELECT id FROM v4_l2.actors LIMIT 1)
) AS test_pulse_result;

-- 6. Verify Outbox
SELECT COUNT(*) FROM v4_l4.outbox_facts WHERE fact_type = 'ACTIVITY_STARTED';

ROLLBACK;
