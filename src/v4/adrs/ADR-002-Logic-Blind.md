# ADR-002: L1 is Logic-Blind

## Status
Accepted

## Context
There is a risk of leaking business logic into the core structural layer.

## Decision
Layer 1 will remain **Logic-Blind**. It does not know about industry types, roles, or business rules.

## Rationale
- Prevents coupling between the organizational structure and the ever-changing business capabilities.
- Ensures the core remains stable for 10+ years regardless of industry shifts.

## Consequences
- Business labeling and authority are moved to Layer 2.
