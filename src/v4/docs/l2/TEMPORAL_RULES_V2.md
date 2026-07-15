# MJRH V4 — Layer 2 Temporal Rules v2.0 (Hardened)

## 1. Temporal Integrity Mechanics
- **SCD Type 4 Pattern:** Active mandates reside in current tables; all history is moved to dedicated audit logs to maintain hyperscale performance.
- **Micro-Precision Sequencing:** Assignments use `transaction_timestamp()` and `EXCLUDE` constraints to ensure absolute continuity.

## 2. Succession Protocol (The Chain of Truth)
- **Immutable Succession:** Every version points to its `predecessor_id`. Tampering with the middle of a chain is physically blocked.
- **The "Grandfather" Clause:** Records in the past are read-only. Corrections spawn a new version with a "Correction" fact type.

## 3. Operational Guards
- **[TEMP_001] Zero-Gap Guard:** New versions must start at the exact millisecond the prior version expired.
- **[TEMP_002] Future-Proofing:** Future-dated assignments are valid in L2 but dormant for L4 execution until $T_{now} \ge T_{effective}$.
- **[TEMP_003] Deletion Prohibition:** Legal records can never be hard-deleted. Only logically terminated via `valid_until`.
