-- MJRH V4 — Layer 1 REAL Concurrency Stress Test (Playbook v1.1)
-- Target: Manual verification of parent-row serialization.

/*
   MANUAL PROCEDURE:
   
   [SESSION 1]
   BEGIN;
   -- Lock the node explicitly to simulate contention
   SELECT * FROM v4_l1.nodes WHERE id = 'target-uuid' FOR UPDATE;
   SELECT pg_sleep(10);
   COMMIT;

   [SESSION 2 - Run immediately after SESSION 1 starts]
   BEGIN;
   -- This will wait for SESSION 1 to commit
   UPDATE v4_l1.nodes SET parent_id = 'new-parent-uuid' WHERE id = 'target-uuid';
   COMMIT;
*/

RAISE NOTICE 'CONCURRENCY_LAB: Playbook updated with explicit SELECT FOR UPDATE pattern.';
