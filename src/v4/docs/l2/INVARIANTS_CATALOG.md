# MJRH V4 — Layer 2 Invariants Catalog v1.4 (Sovereign Bastion)

## 1. Structural Integrity
- **[L2_INV_001] Strict Linkage:** 1:1 Identity-to-Party uniqueness enforced via hard Unique Constraints.
- **[L2_INV_002] Position Dependency:** A Position cannot exist if its parent Org-Node (L1) is deleted or missing.

## 2. Authority & Delegation
- **[L2_INV_003] Acyclic Delegation:** Delegation chains (A->B->C) must never point back to an ancestor.
- **[L2_INV_004] Sequential Signing:** Multi-signer domains must respect the `sequence_order` defined in L2.
- **[L2_INV_005] Active-Only Policy:** Only assignments in `ACTIVE` state can contribute to the Decision Engine (L4). Drafts carry zero authority.

## 3. History & State
- **[L2_INV_006] Immutable Past:** Records with `valid_until < now()` are read-only. No Revocation or Update allowed.
- **[L2_INV_007] Metadata Pulse:** Any change in JSONB metadata triggers an automatic version increment and fact emission.
