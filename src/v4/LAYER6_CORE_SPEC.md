# MJRH V4 — Layer 6 Core Specification v0.1
## Observability Layer (The Consciousness)

### 1. Responsibility
The Real-time Awareness of the Enterprise. Layer 6 is responsible for monitoring system health, performance metrics, and SLA compliance. It transforms raw facts (L5) and live states (L4) into actionable insights and alerts for the governance layer (L2).

### 2. Core Components

#### A. Metric Aggregator
- **Responsibility:** Real-time aggregation of pulses per node/identity.
- **Key Metrics:** Pulse frequency, lead time, throughput.

#### B. SLA Guardian
- **Table:** `v4_l6.sla_policies` & `v4_l6.sla_breaches`.
- **Responsibility:** Detecting when a Work Order pulse exceeds defined time limits between activities.

#### C. Health Scoreboard
- **Responsibility:** Calculating a weighted "Health Score" for Org-Nodes based on:
    - Resource Health (L3).
    - Compliance/Integrity (L5).
    - SLA Performance (L6).

#### D. Alert Registry
- **Table:** `v4_l6.alerts`.
- **Responsibility:** Dispatching sovereign-isolated notifications to Actors with appropriate mandates.

### 3. Cross-Layer Contracts
- **L4 Dependency:** Monitors live transitions in `v4_l4.work_orders`.
- **L5 Dependency:** Periodically verifies chain integrity to update "Trust Score".
- **L2 Dependency:** Resolves alert recipients based on active Assignments and Authorities.

### 4. Architectural Invariants
- **[INV_REALTIME_GATING]:** Observability must not block execution; it operates on the "After-Pulse" pattern.
- **[INV_SOVEREIGN_ALERTS]:** Alerts must never leak across Sovereign Roots.
- **[INV_AUDITABLE_METRICS]:** Any metric used for performance reviews must be reconcilable back to the L5 Ledger.
