# ADR-009: Versioned Competency Matrix

## Status: Accepted
## Context: How to track resource qualifications?
## Decision: Competency records are immutable and versioned with `valid_from` and `valid_until`.
## Rationale: Supports historical replay in Layer 5 (Evidence). If a decision was made in the past, we must know the exact competency level of the resource at that specific timestamp.
