# MJRH V4 — Layer 2 Architecture Blueprint v1.0
## Legal Identity & Institutional Governance

### 1. Domain Logic
- **Identity Proxy:** L2 extends L1 identities but never redefines them.
- **Assignment Logic:** People fill Positions; Positions belong to Departments; Departments mirror Nodes.

### 2. Aggregate Boundaries
- **Party Aggregate:** {IdentityRef, Person/Org Data, Legal Status}.
- **Position Aggregate:** {NodeRef, ReportingLine, Requirements}.
- **Mandate Aggregate:** {Assignment, Authorities, Delegations, Signatures}.

### 3. Temporal & Versioning Strategy
- **Audit-First:** All assignments follow an append-only versioning pattern.
- **Consistency:** `valid_from` and `valid_until` are mandatory for all authority links.

### 4. RPC Interface Goals
- `resolve_person_context(identity_id)`
- `resolve_position_authority(position_id)`
- `verify_effective_delegation(from_id, to_id)`

### 5. Security Architecture
- **Isolation:** RLS enforced by L1 Sovereign Context.
- **Visibility:** A manager can only see subordinates within their mandated Scope.
