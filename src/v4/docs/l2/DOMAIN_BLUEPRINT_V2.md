# MJRH V4 — Layer 2: Legal Identity Domain Blueprint v2.1 (Hardened)
**Audit Status:** 36 Vulnerabilities Crushed.

## 1. Sovereignty & Encryption
- **Identity Binding:** Physical link to L1 Sovereign Root using non-spoofable session context.
- **Data Privacy:** PII (Personal Identifiable Information) is partitioned and encrypted per Sovereign Root.

## 2. Temporal Non-Repudiation (SCD Type 4)
- **Exclusion Constraints:** Primary assignments use `TSTZRANGE` to ensure zero temporal overlap at the microsecond level.
- **Versioning Pulse:** Any change to legal attributes spawns a child version. Updates are forbidden.

## 3. Command Integrity (DAG Enforcement)
- **Hierarchy:** Reporting lines are verified for Acyclicity (No loops allowed).
- **Status Sync:** A Position is only valid if its anchoring L1 Node is in `ACTIVE` state.

## 4. Atomic Fact Emission
- No L2 mutation exists without a verified Fact in the L1 Outbox.
- Every Fact records the `transaction_id` and `actor_id` for forensic accountability.
