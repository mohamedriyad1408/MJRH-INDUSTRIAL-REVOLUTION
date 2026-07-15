# MJRH V4 — Layer 2 Temporal Rules v1.3 (Defensive Grade)

## 1. Absolute Continuity
- **Zero-Overlap Invariant:** PRIMARY assignments use PostgreSQL `EXCLUDE` constraints with `TSTZRANGE` to prevent person-level identity duplication for even a microsecond.
- **Atomic Succession:** Any modification to a legal attribute MUST spawn a new version with an audit-trace to the initiating Actor Assignment ID.

## 2. Temporal Accountability
- **Accountability Link:** Every version change must record `authorized_by_assignment_id` to maintain the legal chain of command.
- **Eternal URN:** Once a Global URN is archived, it remains locked in the global registry to prevent historical shadowing.

## 3. Propagation & Revocation
- **Cascading Invalidation:** If a Root Assignment is suspended, all downstream Delegations and Signatures are automatically frozen at the DB level.
