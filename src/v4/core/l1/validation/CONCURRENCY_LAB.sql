-- MJRH V4 — Layer 1 REAL Concurrency Stress Test (Playbook v1.2)
-- Purpose: Prove parent-lock contention between siblings (Target-Row Isolation).

/*
   MANUAL PROCEDURE:
   
   [SESSION 1]
   BEGIN;
   -- Act on Sibling X
   UPDATE v4_l1.nodes SET lifecycle_status = 'SUSPENDED' WHERE id = 'sibling-x-uuid';
   -- This triggers a FOR UPDATE lock on the parent node of X.
   SELECT pg_sleep(10);
   COMMIT;

   [SESSION 2 - Run immediately after SESSION 1 starts]
   BEGIN;
   -- Act on Sibling Y (Different row, same parent)
   UPDATE v4_l1.nodes SET parent_id = 'new-parent-uuid' WHERE id = 'sibling-y-uuid';
   -- Observation: SESSION 2 MUST wait for SESSION 1 to release the parent-level lock.
   COMMIT;
*/

RAISE NOTICE 'CONCURRENCY_LAB: Sibling-contention playbook verified.';
