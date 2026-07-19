# ADR-003: Identity to Node relationship (1:N)

## Status
Accepted

## Context
We need to decide if an Identity can exist in multiple places in the topology.

## Decision
The relationship is **1:N** (One Identity can anchor multiple Nodes).

## Rationale
- Allows a single legal entity to have multiple functional presences (e.g., a shared service center appearing in different regional branches).
- **Invariant:** An identity cannot be its own ancestor or descendant (Disjoint Branch Rule).

## Consequences
- Requires path-based validation to prevent identity recursion.
