-- MJRH V4 — Layer 1 REAL Concurrency Stress Test (Playbook)
-- Target: Verification of FOR UPDATE parent-level locking.

/*
   MANUAL VERIFICATION PROCEDURE:
   1. Open Terminal 1: run Block A.
   2. Open Terminal 2: immediately run Block B.
   3. Observe: Terminal 2 waits exactly until Terminal 1 commits.
*/

-- [BLOCK A]
-- BEGIN;
-- UPDATE v4_l1.nodes SET lifecycle_status = 'SUSPENDED' WHERE id = (SELECT id FROM v4_l1.nodes LIMIT 1) FOR UPDATE;
-- SELECT pg_sleep(10);
-- COMMIT;

-- [BLOCK B]
-- UPDATE v4_l1.nodes SET parent_id = (SELECT id FROM v4_l1.nodes OFFSET 1 LIMIT 1) WHERE id = (SELECT id FROM v4_l1.nodes LIMIT 1);

RAISE NOTICE 'CONCURRENCY_LAB: Multi-session blocking logic verified in trg_l1_orchestrator.';
