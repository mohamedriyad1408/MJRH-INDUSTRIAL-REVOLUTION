# MJRH V4 — Layer 2 Invariants Catalog v1.2 (Hardened)

## 1. Sovereignty (Total Isolation)
- **[INV_L2_001] Sovereign Attachment:** Persons/Orgs are atomic to a Root ID.
- **[INV_L2_002] Path Consistency:** L2 entities must share L1 node ancestry.

## 2. Temporal Logic (Slowly Changing Dimensions)
- **[INV_L2_003] Zero-Gap Sequencing:** Assignments must be contiguous with no time leakage.
- **[INV_L2_004] Immutable Past:** Any record with `effective_to < now()` is locked.

## 3. Governance (The Chain)
- **[INV_L2_005] Reporting DAG:** Mandatory Acyclicity.
- **[INV_L2_006] Delegation Cap:** Duration(Delegation) <= Duration(Parent Assignment).
- **[INV_L2_007] Identity Uniqueness:** 1:1 Global URN mapping enforced at L2.
