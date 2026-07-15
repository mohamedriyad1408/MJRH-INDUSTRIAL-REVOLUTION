# MJRH V4 — Layer 2 Lifecycle & Policy Engine

## 1. Assignment State Machine
- **DRAFT:** Creation phase.
- **PENDING:** Waiting for effective date or approval.
- **ACTIVE:** Operational and billable.
- **SUSPENDED:** Temporary lock (e.g., leave, investigation).
- **ARCHIVED:** Permanent record closure.

## 2. Policy Engine (L2 Internal)
Decouples business rules from table constraints.
- **Validator:** A set of stored procedures invoked by Triggers.
- **Rules:** 
  - Max 1 Primary Assignment.
  - No acting-role overlap with higher grades.
  - Mandatory Sovereign context match.

## 3. Cryptographic Audit Trail
- Each assignment record contains:
  - `digest`: SHA256(person_id, position_id, effective_from, version).
  - `parent_digest`: Link to the previous version.
