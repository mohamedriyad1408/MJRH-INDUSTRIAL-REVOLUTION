# MJRH V4 — Layer 2 Core Specification v0.1
## Governance, Authority & Institutional Logic

### 1. Responsibility
The Sovereign Brain of the enterprise. Manages the legal right to act (Authority), computes runtime permissions (Authorization), and enforces operating constraints (Policy). It sits above the Structural Layer (L1) and governs the Execution Layer (L4).

### 2. Core Entities
- **Actor:** The subject of authority (Human, Service Account, AI Agent).
- **Mandate:** A formal delegation of power anchored to an L1 Node.
- **Resource Class:** Generic types of assets (Financial, Operational, Human).
- **Policy:** A declarative rule (Condition -> Effect).

### 3. Decisions Model
Every governance request returns a formal **Decision Object**:
- `ALLOW`: Proceed with operation.
- `DENY`: Hard stop (Policy violation).
- `REQUIRE_APPROVAL`: Suspend pending human sign-off.
- `REQUIRE_ESCALATION`: Transfer to higher mandate level.

### 4. Architectural Invariants
- **[INV_MANDATE_ROOT]:** No authority can be exercised without a valid mandate linked to an L1 Sovereign Root.
- **[INV_POLICY_OVERRIDE]:** Policies can restrict a Mandate, but a Mandate cannot violate a hard Compliance Policy.
- **[INV_TEMPORAL_GOVERNANCE]:** Every authority and policy is versioned and time-bound.
