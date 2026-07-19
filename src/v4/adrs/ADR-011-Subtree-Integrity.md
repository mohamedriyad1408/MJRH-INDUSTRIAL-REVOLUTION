# ADR-011: Transactional Integrity of Topology Mutations

## Status: Accepted
## Context: Ensuring atomic safety during large-scale re-parenting.
## Decision: 
1. Use `FOR UPDATE` locks on parent nodes during path calculation.
2. Use a single `AFTER UPDATE` trigger for descendant propagation.
3. Rely on PostgreSQL Serializability/Read Committed transaction isolation.
## Rationale: 
- Prevents "Hierarchy Splitting" where a child path is calculated based on an outdated parent path.
- Ensures that a subtree move is an atomic event: either the entire branch moves or none of it does.
