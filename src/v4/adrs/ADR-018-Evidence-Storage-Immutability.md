# ADR-018: Layer 5 Evidence Storage and Immutability Strategy

## Status
Proposed

## Context
Layer 5 (Evidence) must store operational facts produced by Layer 4 for at least 10 years. The data volume will be significant (potentially billions of rows for a 100k+ employee enterprise). We need a strategy that guarantees immutability while maintaining query performance for sovereign audits.

## Decision
1.  **Architecture:** We will use **PostgreSQL Table Partitioning** based on `sovereign_root_id` and `created_at` (Time-range).
2.  **Immutability Enforcement:** 
    *   Implement a `BEFORE UPDATE OR DELETE` trigger that raises an exception for any attempt to modify data in the `v4_l5.evidence_ledger`.
    *   Revoke all UPDATE/DELETE permissions from the application-level database role.
3.  **Persistence Flow:** 
    *   A background process (or triggered function) will move data from `v4_l4.outbox_facts` to `v4_l5.evidence_ledger`.
    *   Once moved, the fact in the L4 outbox can be safely archived/purged.
4.  **Sovereign Proof:** Each record will store a `SHA-256` hash of the (Payload + Sequence Number + Previous Hash) to create an internal chain of integrity within each sovereign root.

## Technical Model
- **Ledger:** `v4_l5.evidence_ledger` (id, sovereign_root_id, work_order_id, fact_data, chain_hash).

## Consequences
- **Positive:** High performance for audits within a specific timeframe or root. Hardened security against data tampering.
- **Negative:** Increased complexity in hashing and chain verification. Storage overhead for hashes.
