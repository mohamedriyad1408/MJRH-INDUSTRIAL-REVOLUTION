# MJRH V4 — Layer 2 Architecture Blueprint v1.0

## 1. Domain Entities & Hierarchy
- **Legal Entity (Organization):** Bound to L1 Sovereign Root.
- **Functional Node (Dept/Division):** Bound to L1 Internal Nodes.
- **Position:** The blueprint of a job.
- **Assignment:** The bridge between a Person and a Position.

## 2. Temporal Logic (Versioning)
Every change in an Assignment or Authority creates a new immutable version.
`assignment_id` -> `version_id` -> `previous_version_id` -> `effective_range`.

## 3. Authority Model
- **Primary vs Secondary Assignments.**
- **Signature Domains:** FINANCE, HR, LEGAL, OPS, PROC.
- **Limits:** Every authority can have an associated numeric threshold.

## 4. Reporting Structure
Supports multiple relationship types:
- `DIRECT`: Standard line manager.
- `FUNCTIONAL`: Professional reporting.
- `MATRIX`: Shared project reporting.

## 5. Global Invariants
- No Person can have multiple Primary Assignments in one Organization.
- No Delegation can exceed the owner's original authority scope.
- Cross-Sovereign movements are strictly prohibited at the DB layer.
