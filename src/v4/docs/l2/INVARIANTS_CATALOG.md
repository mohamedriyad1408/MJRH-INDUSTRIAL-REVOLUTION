# MJRH V4 — Layer 2 Invariants Catalog v1.1

## 1. Sovereignty & Registration
- **[L2_INV_001] Permanent Binding:** Once an Identity is linked to Root A, it cannot be linked to Root B.
- **[L2_INV_002] Sovereign Consistency:** All Position Instances must share the same Sovereign Root as their anchoring L1 Node.

## 2. Assignment & Temporal Guard
- **[L2_INV_003] Primary Uniqueness:** Max one ACTIVE PRIMARY assignment per Person-Organization pair.
- **[L2_INV_004] Atomic Time Windows:** All temporal changes must use `transaction_timestamp()` to ensure zero-gap sequencing.
- **[L2_INV_005] Immutability:** Historical assignments are read-only and version-locked.

## 3. Hierarchy Guard
- **[L2_INV_006] Acyclic Chain:** Reporting lines must form a DAG.
- **[L2_INV_007] Scope Authority:** A manager's functional authority is limited to the sub-tree defined in L1.
