# ADR-013: Cryptographic Chaining for Legal Assignments

## Status: Accepted
## Context: Ensuring the integrity of the professional history and authority chain.
## Decision: Each assignment version must store a SHA-256 digest of its state plus the digest of the previous version.
## Rationale: Makes the audit trail immutable and verifiable. Even with DB administrator access, altering history without breaking the chain is mathematically impossible.
