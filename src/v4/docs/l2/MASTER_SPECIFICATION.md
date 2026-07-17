# MJRH V4 — Layer 2: Master Specification (Legal Identity Engine)

## 1. Domain Model
L2 provides the legal and operational persona to L1's structural nodes.
- **Parties:** Individuals and Legal Entities.
- **Positions:** Functional roles within the Org-Tree.
- **Assignments:** Temporal links between Persons and Positions.

## 2. State Machines
### Assignment States:
`DRAFT` -> `ACTIVE` -> `SUSPENDED` -> `ARCHIVED`.
- Only one `ACTIVE` Primary assignment is allowed per Person per Organization.

## 3. Authority Matrix
- Domains: FINANCE, OPS, HR, LEGAL, PROCUREMENT.
- Levels: ADVISORY, OPERATIONAL, APPROVAL, SIGNATURE.

## 4. Temporal Strategy (Versioning)
- Assignments follow the **SCD Type 2** pattern (Slowly Changing Dimensions).
- Audit fields: `version`, `effective_from`, `effective_to`, `superseded_by_id`.

## 5. RPC Public Contracts
- `resolve_person_v1(id)`: Returns legal profile.
- `resolve_manager_v1(node_id)`: Returns active authority in node.
- `verify_signature_v1(id, domain, limit)`: Returns boolean decision.

## 6. Security Model
- **Sovereign Isolation:** L2 RLS depends on L1 Context resolution.
- **Data Privacy:** Personal metadata is encrypted/isolated per Sovereign Root.

## 7. Test Strategy
- **Temporal Tests:** Overlapping assignment prevention.
- **Integrity Tests:** Ensuring no L2 record exists without an L1 root.
- **Concurrency Tests:** High-frequency delegation race protection.
