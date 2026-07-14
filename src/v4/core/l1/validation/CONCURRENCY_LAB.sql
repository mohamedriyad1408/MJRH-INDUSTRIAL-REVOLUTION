-- MJRH V4 — Concurrency Stress Lab
-- Scenario: Session A holds a lock on Node X while Session B tries to move Node X.

-- [SESSION A]
-- BEGIN;
-- UPDATE v4_l1.nodes SET metadata = '{"locking": true}' WHERE id = 'target_uuid';
-- SELECT pg_sleep(5);
-- COMMIT;

-- [SESSION B]
-- UPDATE v4_l1.nodes SET parent_id = 'new_parent_uuid' WHERE id = 'target_uuid';
-- Result: Session B MUST wait for Session A to release the FOR UPDATE lock in the trigger.
