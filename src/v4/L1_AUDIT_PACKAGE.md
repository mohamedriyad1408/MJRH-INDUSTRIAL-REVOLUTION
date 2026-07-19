# MJRH V4 — Layer 1 Audit Package (Structural Identity)
**Status:** Frozen Candidate (v3.3 - Superior)
**Commit:** 0fab8e64574efad49778f094aab10c2f08b1130d

## 1. Documentation & Specification
- [Enterprise Constitution](../ENTERPRISE_CONSTITUTION.md)
- [Enterprise Layers](../ENTERPRISE_LAYERS.md)
- [Institutional Meta-Model](../META_MODEL.md)
- [Layer 1 Core Specification](../LAYER1_CORE_SPEC.md)

## 2. Architectural Decisions (ADRs)
- ADR-001 to ADR-011 in `src/v4/adrs/`

## 3. Implementation (Persistence & Service)
- **SQL Migration:** `supabase/migrations/20260721000000_v4_l1_implementation.sql`
- **TrustGate API:** `src/v4/core/l1/TrustGate.ts`

## 4. Verification & Proofs
- **Acceptance Suite:** `src/v4/core/l1/tests/l1_acceptance.sql`
- **Concurrency Proof:** `src/v4/core/l1/validation/CONCURRENCY_STRESS.sql`
- **Performance Evidence:** `src/v4/core/l1/validation/PERFORMANCE_GATE.md`

## 5. Engineering Safeguards
- [x] Recursive Guard implemented.
- [x] Atomic Subtree Facts emission for all descendants.
- [x] Hardened Identity Path Uniqueness (Ancestors + Descendants).
- [x] Pessimistic Locking (FOR UPDATE) on parent nodes.
