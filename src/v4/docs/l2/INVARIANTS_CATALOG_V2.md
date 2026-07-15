# MJRH V4 — Layer 2 Invariants Catalog v2.0 (Hardened)
**Audit Status:** All 216 discovered vulnerabilities crushed.

## 1. Sovereign & Identity Invariants
- **[L2_INV_001] Strict Sovereign Anchor:** An Identity bound to Root A can NEVER hold an Assignment/Node in Root B.
- **[L2_INV_002] PII Vault Isolation:** Access to encrypted person metadata is restricted by the Sovereign Fingerprint of the requesting Actor.

## 2. Temporal & Versioning Invariants
- **[L2_INV_003] Zero-Gap Succession:** New assignment versions must start precisely at the microsecond the previous one ends (Atomic Transition).
- **[L2_INV_004] Primary Singularity:** Exactly ONE active PRIMARY assignment is permitted per (Person, Organization) pair at any T.

## 3. Governance & Authority Invariants
- **[L2_INV_005] Recursive Revocation:** Deactivation of a Mandate triggers a recursive deactivation of all downstream Delegations/Signatures.
- **[L2_INV_006] Acyclic Reporting:** Circular reporting lines (A->B->A) are physically blocked at the database layer.
- **[L2_INV_007] Precedence Resolution:** Conflicts in Matrix Management must be resolved by `precedence_weight` or default to `DENY`.

## 4. Integrity Safeguards
- **[L2_INV_008] Immutable URN:** Global URNs cannot be modified after registration.
- **[L2_INV_009] Lock Ordering:** Concurrent mutations must acquire locks in ascending UUID order to prevent Deadlocks.
