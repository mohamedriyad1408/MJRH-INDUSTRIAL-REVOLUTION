# MJRH V4 — Layer 2 Invariants Catalog v1.3 (Audit Hardened)

## 1. Sovereign & Identity
- **[L2_INV_001] Eternal Binding:** Global URNs are immutable and non-reusable across the lifecycle.
- **[L2_INV_002] Multi-Currency Limits:** Signature thresholds MUST include a Currency ISO Code (L1 reference).

## 2. Assignment Integrity
- **[L2_INV_003] Atomic Handover:** A new PRIMARY assignment must logically and physically close the previous version in the same Transaction.
- **[L2_INV_004] Grade Hierarchy:** A Position cannot report to another Position of a lower `Job Grade` unless explicitly allowed by a Policy.

## 3. Delegation & Safety
- **[L2_INV_005] Sub-Delegation Block:** Delegated authority cannot be re-delegated (No recursive authority leaks).
- **[L2_INV_006] Coverage Invariant:** ACTING assignments must link to a specific source event (e.g., Leave of Absence).
