# MJRH V4 — Layer 2 Temporal Rules v1.4 (Atomic Execution)

## 1. Temporal Integrity
- **Atomicity:** Closing an old version and opening a new one is a single non-divisible DB pulse.
- **Snapshot Proof:** Every Fact emitted includes the `version_id` of the record at that exact microsecond.

## 2. Lifecycle Guards
- **Archival Lock:** Once a Person is ARCHIVED, all associated active assignments must be terminated in the same transaction.
- **Restoration Logic:** Restoring a node requires an explicit `RESTORATION_FACT` with a trace to the authorizing Actor.
