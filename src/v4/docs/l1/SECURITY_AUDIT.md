# MJRH V4 — Layer 1 Security Audit Report

## 1. Row Level Security (RLS)
- **Status:** ENABLED on all L1 tables.
- **Mechanism:** Structural Isolation Path check. 
- **Verification:** Users cannot resolve nodes outside their sovereign root even via RPC.

## 2. Function Security
- **Isolation:** All functions use explicit `search_path` to prevent hijacking.
- **Privilege:** Default `public` execution revoked for internal triggers and invariant checks.

## 3. Data Integrity
- **Immutability:** Sovereign identity binding and URNs are protected via BEFORE triggers.
- **Audit:** Structural outbox captures ActorID for all mutations.

## 4. Threat Model Summary
| Threat | Mitigation | Status |
| :--- | :--- | :--- |
| SQL Injection | Parameterized UUID inputs in RPCs. | ✅ Mitigated |
| Sovereign Leak | Path-based RLS + Context Guard. | ✅ Mitigated |
| Deadlock DoS | Deterministic Top-Down Locking. | ✅ Mitigated |
