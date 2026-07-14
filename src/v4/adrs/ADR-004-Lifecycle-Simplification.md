# ADR-004: Lifecycle Simplification

## Status
Accepted

## Context
Initial design included multiple terminal states like `DECOMMISSIONED` and `ARCHIVED`.

## Decision
Simplify the Node lifecycle to: `DRAFT` -> `ACTIVE` -> `SUSPENDED` -> `ARCHIVED`.

## Rationale
- `DECOMMISSIONED` is a business/operational policy concern (L2) rather than a structural one.
- `ARCHIVED` is sufficient to represent the structural end of a node while preserving historical integrity for L5.

## Consequences
- Cleaner state machine in the core.
