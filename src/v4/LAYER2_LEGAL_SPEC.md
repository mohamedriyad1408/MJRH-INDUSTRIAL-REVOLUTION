# MJRH V4 — Layer 2: Legal Identity Engine Specification

## 1. Scope & Responsibility
L2 is responsible for the legal and operational status of identities. It manages:
- **Parties:** Natural Persons and Legal Organizations.
- **Functional Structure:** Departments and Positions.
- **Authority:** Assignments, Delegations, and Signature Rights.

## 2. Structural Invariants
- **[INV_L1_BINDING]:** Every L2 entity must reference an L1 Sovereign Identity or Node.
- **[INV_TEMPORAL_IMMUTABILITY]:** Legal assignments are versioned. History is never deleted.
- **[INV_SIGNATURE_ISOLATION]:** Rights to sign are granular and domain-specific.

## 3. Core Objects
- `persons`: Maps Human Identity to personal attributes.
- `organizations`: Maps Sovereign Identity to legal attributes.
- `assignments`: The link between a Person and a Position.
- `delegations`: Temporary transfer of authority.
