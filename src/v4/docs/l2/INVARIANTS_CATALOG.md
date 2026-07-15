# MJRH V4 — Layer 2 Invariants Catalog v1.0

## 1. Sovereignty Invariants
- **[L2_INV_001] Strict Sovereign Binding:** A Person ID is bound to a single Sovereign Root upon its first Assignment. Cross-sovereign identity usage is prohibited.
- **[L2_INV_002] Structural Alignment:** All Departments and Positions must resolve to the same Sovereign Root as their underlying L1 Nodes.

## 2. Assignment Invariants
- **[L2_INV_003] Primary Singularity:** A Person can hold exactly ONE active PRIMARY assignment per Organization at any point in time.
- **[L2_INV_004] Temporal Non-Overlap:** Sequential assignments for the same Person-Position pair must have disjoint time ranges.
- **[L2_INV_005] Status Integrity:** Active assignments require an ACTIVE L1 Node and an ACTIVE L2 Person.

## 3. Authority & Delegation Invariants
- **[L2_INV_006] Reporting DAG:** Reporting lines must be acyclic. Self-reporting or circular reporting is blocked at the DB layer.
- **[L2_INV_007] Delegation Lifecycle:** Delegations are strictly bound by the Grantor's assignment period. If the Grantor leaves, delegations expire.
- **[L2_INV_008] Signature Thresholds:** A Signature Right cannot be granted for a domain or amount that exceeds the grantor's own Authority.
