# ADR-012: Structural Locking Hierarchy

## Status: Accepted
## Context: Preventing Deadlocks during concurrent tree mutations.
## Decision: 
All structural mutations must acquire locks in a strict **Top-Down** order.
1. Acquire `FOR UPDATE` on the Parent Node.
2. The Database then automatically locks the target and affected descendants.
## Rationale: 
Ensures that two concurrent moves involving overlapping branches will always serialize correctly rather than creating a wait-cycle.
