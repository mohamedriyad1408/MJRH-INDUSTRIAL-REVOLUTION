# MJRH V4 — Layer 2 Temporal Rules v1.0

## 1. Versioning Pattern
All legal assignments and authorities follow an append-only, versioned pattern. 
- **Immutable Past:** No record can be edited once `valid_until` is set.
- **Traceable Succession:** `superseded_by_id` links versions into a continuous chain.

## 2. Integrity Guards
- **[TEMP_001] Continuity:** New versions must begin exactly when previous versions end.
- **[TEMP_002] Atomic Handover:** Closing a version and opening a new one must be a single DB transaction.
- **[TEMP_003] Logical Deletion:** Removal is handled by setting `valid_until = now()` and status to `ARCHIVED`.

## 3. Precision Rules
- All timestamps must use `transaction_timestamp()` for consistency within a pulse.
- Overlap prevention is enforced via `EXCLUDE` constraints using `TSTZRANGE` where applicable.
