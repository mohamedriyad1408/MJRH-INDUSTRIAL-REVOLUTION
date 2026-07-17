-- MJRH V4 — Industrial Laundry DNA: GOVERNANCE & OPERATIONS
-- This seeds the Template into the Core OS tables.

BEGIN;

-- 1. SEED JOB BLUEPRINTS (L2)
INSERT INTO v4_l2.job_blueprints (id, code, title_ar, title_en, required_capabilities)
VALUES 
(gen_random_uuid(), 'LDR_INTAKE', 'موظف استقبال', 'Intake Clerk', '{ops.intake}'),
(gen_random_uuid(), 'LDR_TECH', 'فني تشغيل', 'Laundry Technician', '{ops.processing}'),
(gen_random_uuid(), 'LDR_QC', 'مراقب جودة', 'QC Auditor', '{ops.audit}');

-- 2. SEED VALUE STREAM (L4)
-- We use a fixed UUID for the stream for referencing.
INSERT INTO v4_l4.value_streams (id, sovereign_root_id, name, version)
VALUES 
('10101010-0000-4000-b000-000000000001', 
 (SELECT id FROM v4_l1.nodes WHERE node_path = '_root' LIMIT 1), -- Default seeding root
 'INDUSTRIAL_LAUNDRY_V1', 1);

-- 3. SEED ACTIVITIES (L4)
INSERT INTO v4_l4.activities (id, stream_id, name, sequence_order, mandate_required)
VALUES 
('a1111111-0000-4000-b000-000000000001', '10101010-0000-4000-b000-000000000001', 'Intake', 10, 'OPERATIONAL_ENTRY'),
('a1111111-0000-4000-b000-000000000002', '10101010-0000-4000-b000-000000000001', 'Cleaning', 20, 'OPERATIONAL_EXEC'),
('a1111111-0000-4000-b000-000000000003', '10101010-0000-4000-b000-000000000001', 'Ironing', 30, 'OPERATIONAL_EXEC'),
('a1111111-0000-4000-b000-000000000004', '10101010-0000-4000-b000-000000000001', 'Quality Control', 40, 'OPERATIONAL_AUDIT');

-- 4. SEED SLA POLICIES (L6)
INSERT INTO v4_l6.sla_policies (activity_id, target_duration, critical_duration)
VALUES 
('a1111111-0000-4000-b000-000000000002', interval '120 minutes', interval '180 minutes'),
('a1111111-0000-4000-b000-000000000003', interval '45 minutes', interval '60 minutes');

-- 5. SEED UI FORM SCHEMAS (L7)
INSERT INTO v4_l7.form_schemas (activity_id, schema_json)
VALUES 
('a1111111-0000-4000-b000-000000000001', 
 '{"type": "object", "properties": {"customer_name": {"type": "string"}, "pieces": {"type": "number"}, "urgent": {"type": "boolean"}}}'),
('a1111111-0000-4000-b000-000000000004', 
 '{"type": "object", "properties": {"passed": {"type": "boolean"}, "defects": {"type": "string"}}}');

COMMIT;
