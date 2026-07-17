# MJRH V4 — Layer 4 Core Specification v1.0
## Runtime Execution Layer (The Pulse)

### 1. Responsibility
The Orchestrator of action. Layer 4 is responsible for managing the lifecycle of work as it moves through value streams. It coordinates between structural identity (L1), governance (L2), and readiness (L3) to execute atomic business operations.

### 2. Core Components

#### A. Value Stream Blueprints
- **Table:** `v4_l4.value_streams`
- **Responsibility:** Defines process templates.
- **Attributes:** `id`, `name`, `version`, `sovereign_root` (L1).

#### B. Activity Catalog
- **Table:** `v4_l4.activities`
- **Responsibility:** Defines atomic steps.
- **Attributes:** `blueprint_id`, `type`, `l3_requirement_manifest`, `l2_mandate_required`.

#### C. Work Order Registry (Jobs)
- **Table:** `v4_l4.work_orders`
- **Responsibility:** Tracking active instances of value creation.
- **Invariants:** Must have a `node_id` (L1). Current activity must exist in the assigned blueprint.

#### D. Pulse Engine (Orchestrator)
- **Function:** `fn_v_execute_pulse`
- **Flow:**
    1. Lock Work Order (pessimistic).
    2. Check L2 Policy (Can this Actor do this?).
    3. Check L3 Readiness (Is the target activity ready?).
    4. Update state.
    5. Emit Fact (Outbox).

### 3. Cross-Layer Contracts
- **L1 Dependency:** Every Job is anchored to an Org-Node.
- **L2 Dependency:** Every transition requires an `ALLOW` decision from Governance.
- **L3 Dependency:** Every activity requires a `READY` certificate from Readiness.

### 4. Architectural Invariants
- **[INV_READY_PULSE]:** No job can transition to an active state without L3 certification.
- **[INV_POLICY_GATE]:** The State Machine is physically incapable of bypassing L2 checks.
- **[INV_TRACEABILITY]:** Every operational pulse must emit a fact containing the Sovereign Context.
- **[INV_SOVEREIGN_LOCK]:** Cross-root pulses are prohibited unless via a specific Handover blueprint.
