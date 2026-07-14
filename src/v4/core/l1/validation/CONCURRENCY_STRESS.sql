-- MJRH V4 — Layer 1 REAL Concurrency Stress Test (v3.2)
-- How to run: Execute Block A in Session 1, then immediately Block B in Session 2.

/*
-- [SESSION 1]
BEGIN;
  -- Take a lock and sleep to simulate network/processing delay
  UPDATE v4_l1.nodes SET lifecycle_status = 'SUSPENDED' WHERE id = 'some_node_id';
  SELECT pg_sleep(10); 
COMMIT;
*/

/*
-- [SESSION 2]
BEGIN;
  -- This MUST block until Session 1 commits, proving FOR UPDATE integrity
  UPDATE v4_l1.nodes SET parent_id = 'some_other_parent' WHERE id = 'some_node_id';
COMMIT;
*/

RAISE NOTICE 'CONCURRENCY_STRESS: Script prepared for manual multi-session verification.';
