# MJRH V4 — Layer 2 RPC Catalog v1.0

## 1. Identity & Identity Resolvers
### `resolve_person_v1(urn text)`
- **Output:** `JSONB { person_id, legal_name, sovereign_root_id, status }`
- **Security:** RLS Enforced.

### `resolve_effective_assignment_v1(actor_id uuid)`
- **Output:** `UUID (AssignmentID)`
- **Rule:** Filters by `now() <@ valid_range` and status `ACTIVE`.

## 2. Organization & Authority
### `resolve_chain_of_command_v1(node_id uuid)`
- **Output:** `SETOF (AssignmentID, PositionTitle, Level)`
- **Logic:** Walks up the L1 path and resolves legal positions.

### `verify_signature_authority_v1(actor_id uuid, domain text, amount numeric)`
- **Output:** `BOOLEAN`
- **Logic:** Checks `signatures` table + active `delegations`.

## 3. Governance & Audit
### `resolve_effective_authority_v1(actor_id uuid, action_scope text)`
- **Output:** `JSONB { can_execute, limits, delegation_trace_id }`
