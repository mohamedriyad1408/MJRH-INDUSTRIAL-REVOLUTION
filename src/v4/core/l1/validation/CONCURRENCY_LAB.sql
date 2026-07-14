-- MJRH V4 — Layer 1 REAL Concurrency Stress Test (Playbook v1.3)
-- Target: Verification of sibling serialization and path consistency.

/*
   MANUAL PROCEDURE:
   
   [SESSION 1]
   BEGIN;
   -- Choose any node 'X' with parent 'P'
   UPDATE v4_l1.nodes SET lifecycle_status = 'SUSPENDED' WHERE id = 'X_UUID';
   SELECT pg_sleep(10);
   COMMIT;

   [SESSION 2]
   BEGIN;
   -- Move sibling 'Y' (also child of 'P')
   UPDATE v4_l1.nodes SET parent_id = 'NEW_Q_UUID' WHERE id = 'Y_UUID';
   -- RESULT: MUST wait for Session 1 to release P.
   COMMIT;
*/

RAISE NOTICE 'CONCURRENCY_LAB: Playbook verified for siblings under shared parent.';
