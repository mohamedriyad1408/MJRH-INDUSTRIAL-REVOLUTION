# ADR-010: Persistence Integrity & Trigger-Based Path Enforcement

## Status: Accepted
## Context: Ensuring data quality for the structural path.
## Decision: The `node_path` is marked as `NOT NULL` and is managed exclusively by a `BEFORE INSERT OR UPDATE` trigger.
## Rationale: 
- Guarantees that no record can enter the database with an invalid or missing path.
- Application layer remains decoupled from the mathematical complexity of ltree labels.
- Performance: Path calculation happens once per mutation, facilitating O(1) reads for all upper layers.
