# ADR-008: Computed Operational Readiness

## Status: Accepted
## Context: Should readiness state be stored or calculated?
## Decision: Readiness is a computed outcome of the `fn_evaluate_readiness` function.
## Rationale: Operational state is highly dynamic. Storing it leads to cache invalidation risks. Real-time calculation ensures the system always reflects the truth of its resources and policies.
