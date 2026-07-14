-- MJRH V4 — Layer 1 REAL Concurrency Stress Test
-- Procedure: Run Block A in Session 1, then Block B in Session 2.

-- [SESSION A]
-- BEGIN;
-- UPDATE v4_l1.nodes SET lifecycle_status = 'SUSPENDED' WHERE id = 'target_uuid';
-- SELECT pg_sleep(10); -- Hold the FOR UPDATE lock
-- COMMIT;

-- [SESSION B]
-- UPDATE v4_l1.nodes SET parent_id = 'new_parent_uuid' WHERE id = 'target_uuid';
-- RESULT: Session B must wait for Session A to finish before path recalculation starts.
