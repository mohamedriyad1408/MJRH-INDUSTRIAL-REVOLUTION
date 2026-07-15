# ADR-016: Legal Identity First Architecture

## Status: Accepted
## Context: How to represent people and organizations in V4.
## Decision: Layer 2 MUST NOT create standalone records. Every person, organization, or department in L2 is an extension of an L1 Identity or Node.
## Rationale: Maintains strict constitutional integrity. If a node is moved in L1, all its legal assignments in L2 follow it automatically via Foreign Key integrity.
