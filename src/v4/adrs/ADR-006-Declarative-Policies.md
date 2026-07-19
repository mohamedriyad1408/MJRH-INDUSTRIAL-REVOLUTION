# ADR-006: Declarative Policy Model

## Status: Accepted
## Context: How to store business rules?
## Decision: Policies must be stored as declarative JSON structures (Condition, Operator, Target, Effect).
## Rationale: Avoids database-specific lock-in and allows rules to be evaluated by different engines or AI agents.
