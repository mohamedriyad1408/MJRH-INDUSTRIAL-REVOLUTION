# MJRH V4 — Layer 1 Core Specification v2.3 (Final Candidate)

## 1. Topology Engine Boundary Contract
The Topology Engine is the sole sovereign gatekeeper for structural mutations.

### Responsibilities:
- Atomic application of tree mutations (Add, Move, Archive).
- Enforcement of Invariants (Cycles, Sovereignty, Identity Pathing).
- Emission of Structural Mutation Facts to the global event bus.

### Exclusions:
- No knowledge of Authorization (L2).
- No knowledge of Business Rules (L2).
- No knowledge of Audit Persistence (L5).

## 2. Structural Mutation Fact (Abstract Contract)
Every structural change MUST emit a fact with the following schema:
- `fact_id`: Unique trace ID.
- `subject_id`: Identity global URN.
- `anchor_id`: Target Node ID.
- `delta`: Previous vs New Path.
- `boundary_id`: Associated Sovereign Root.
- `timestamp`: Event occurrence time.

## 3. Core Invariants (Immutable Rules)
1. **NO_IDENTITY_RECURSION:** An identity cannot exist twice in any single ancestry path.
2. **ACYLIC_GRAPH:** Tree must always be a Directed Acyclic Graph (DAG).
3. **SOVEREIGN_ROOT_FIXITY:** Sovereign Roots cannot be moved or re-parented.
4. **ATOMicity:** Any node move must propagate path updates to all descendants in a single transaction.
