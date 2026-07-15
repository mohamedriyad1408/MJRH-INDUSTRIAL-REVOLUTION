# MJRH V4 — Layer 2 Invariants Catalog v2.1 (Coherent)

## 1. Sovereignty Invariants
- **[L2_INV_001] Root Binding:** An Actor and their assigned Position MUST resolve to the same Sovereign Root.
- **[L2_INV_002] Isolation Barrier:** No L2 query can bypass the `sovereign_root_id` filter.

## 2. Temporal Invariants
- **[L2_INV_003] No-Gap Succession:** `NEW.valid_from == PREV.valid_until`.
- **[L2_INV_004] Immutability:** Historical nodes are READ-ONLY.

## 3. Logical Invariants
- **[L2_INV_005] Chain Integrity:** `predecessor_id` must point to a valid record of the same Actor/Position.
- **[L2_INV_006] Mandate Limit:** Delegation validity range ⊂ Parent Assignment validity range.
