# MJRH V4 — Layer 2 Core Specification v1.1 (HARDENED)

## 1. Policy Version Resolution
- **Algorithm:** Temporal Match. 
- **Rule:** The engine MUST use the policy version where `T(event) ∈ [valid_from, valid_until)`. 
- **Fallback:** If multiple versions match due to overlap, the one with the highest `version_id` is selected.

## 2. Conflict Resolution (Intra-layer)
If multiple policies of the same class (e.g., Business) apply:
1. **Explicit Deny:** If any policy returns DENY, the final decision is DENY.
2. **Specificity:** The policy anchored to the node closest to the target (deepest in tree) wins.
3. **Priority Weight:** If depths are equal, the higher `priority_score` wins.

## 3. Governance Composition
- **Mandates:** ADDITIVE (Union). An actor gains the sum of all granted mandates across all assigned nodes.
- **Policies:** RESTRICTIVE (Intersection). An action is permitted only if it satisfies EVERY applicable policy.

## 4. Caching Contract
- **TTL:** 300 seconds for resolved mandates.
- **Invalidation:** Mandatory cache purge on `IDENTITY_MOVED` or `MANDATE_REVOKED` events.
