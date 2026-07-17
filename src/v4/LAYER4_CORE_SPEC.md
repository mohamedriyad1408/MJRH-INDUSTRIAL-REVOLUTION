# MJRH V4 — Layer 4 Core Specification v0.1
## Runtime Execution Layer (The Pulse)

### 1. Responsibility
The Orchestrator of action. Layer 4 is responsible for managing the lifecycle of work as it moves through value streams. It coordinates between structural identity (L1), governance (L2), and readiness (L3) to execute atomic business operations.

### 2. Core Components

#### A. Value Stream Engine
- **Responsibility:** Defines the sequences of activities.
- **Owns:** Process blueprints, activity links.

#### B. Runtime State Machine
- **Responsibility:** Managing the live state of every active Job.
- **Rules:** State transitions are governed by L2 policies and L3 readiness.

#### C. Job Registry (Work Orders)
- **Responsibility:** Tracking active instances of value creation.
- **Owns:** Job metadata, current activity anchor, progress tracking.

### 3. Cross-Layer Contracts
- **L1 Dependency:** Every Job is anchored to an Org-Node.
- **L2 Dependency:** Every transition requires an `ALLOW` decision from Governance.
- **L3 Dependency:** Every activity requires a `READY` certificate from Readiness.

### 4. Architectural Invariants
- **[INV_READY_PULSE]:** No job can transition to an active state without L3 certification.
- **[INV_POLICY_GATE]:** The State Machine is physically incapable of bypassing L2 checks.
- **[INV_TRACEABILITY]:** Every operational pulse must emit a fact containing the Sovereign Context.
