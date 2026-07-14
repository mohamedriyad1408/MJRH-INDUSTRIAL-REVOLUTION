-- MJRH V4 — Layer 1 Hostile Audit Suite
BEGIN;

-- SETUP
INSERT INTO v4_l1.identities (id, legal_name, global_urn, is_sovereign_root) 
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Audit Root', 'urn:audit:root', true);
INSERT INTO v4_l1.nodes (id, identity_id, node_class) 
VALUES ('00000000-0000-0000-0000-00000000000a'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'SOVEREIGN_ROOT');

-- THREAT 1: Identity URN Mutation (Integrity Leak)
RAISE NOTICE 'AUDIT: Checking URN Immutability...';
UPDATE v4_l1.identities SET global_urn = 'urn:hacked:root' WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
-- Result: IT PASSES. Architecture Violation. URN must be immutable for L5 integrity.

-- THREAT 2: Orphaned Facts (Consistency Leak)
RAISE NOTICE 'AUDIT: Checking Fact Persistence on Logic Failure...';
-- If an invariant fails, do facts roll back? (ACID check)
BEGIN
    UPDATE v4_l1.nodes SET parent_id = '00000000-0000-0000-0000-00000000000a' WHERE id = '00000000-0000-0000-0000-00000000000a'; -- Cycle
EXCEPTION WHEN OTHERS THEN
    IF EXISTS (SELECT 1 FROM v4_l1.structural_mutation_facts WHERE node_id = '00000000-0000-0000-0000-00000000000a') THEN
        RAISE EXCEPTION 'CRITICAL: Fact emitted even on failed transaction!';
    END IF;
    RAISE NOTICE 'PASS: Transactional Integrity holds for facts.';
END;

-- THREAT 3: Resource Exhaustion (Ltree label limits)
RAISE NOTICE 'AUDIT: Checking Path Complexity limits...';
-- PostgreSQL ltree labels have a limit of 256 characters per label and total path size limits.
-- Since we use UUIDs (_ + 32 chars), it is safe (~33 chars). Max levels ~80-100.
-- But is node_path indexed for large-scale depth? (GiST verified).

-- THREAT 4: Silent Node Class Downgrade
RAISE NOTICE 'AUDIT: Attempting to downgrade SOVEREIGN_ROOT to INTERNAL_NODE...';
UPDATE v4_l1.nodes SET node_class = 'INTERNAL_NODE' WHERE id = '00000000-0000-0000-0000-00000000000a';
-- Result: IT PASSES. Architecture Violation. Class must be immutable.

ROLLBACK;
