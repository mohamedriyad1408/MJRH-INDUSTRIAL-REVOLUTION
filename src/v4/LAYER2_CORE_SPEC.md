# MJRH V4 — Layer 2: Governance & Policy Specification v1.1

## 1. Policy Version Resolution
- **Algorithm:** Temporal Match (Point-in-Time).
- **Rule:** Select policy where `ValidFrom <= T(event) < ValidUntil`.
- **Precedence:** Highest `version_id` if overlaps exist.

## 2. Conflict Resolution
- **Prio 1:** Explicit DENY always wins.
- **Prio 2:** Proximity Wins (Policy anchored to Node closest to the action).
- **Prio 3:** Highest `priority_score` (Numeric weight).

## 3. Composition Rules
- **Mandates:** UNION (Additive). Total rights = Sum of all valid mandates.
- **Policies:** INTERSECTION (Restrictive). Action allowed only if ALL policies permit.

## 4. Caching Contract
- **Duration:** 300s default TTL.
- **Invalidation:** Mandatory purge triggered by L1 Structural Facts or Mandate Revocation.
