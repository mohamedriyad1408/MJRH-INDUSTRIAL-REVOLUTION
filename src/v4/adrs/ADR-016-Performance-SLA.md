# ADR-016: Performance SLA for Structural Mutations

## Status: Accepted
## Context: Defining expectations for core structural changes.
## Decision: 
1. Structural Context resolution must never exceed 1ms.
2. Subtree moves up to 1000 nodes must complete in < 250ms.
## Rationale: To ensure real-time responsiveness for global enterprises even during large-scale re-organizations.
