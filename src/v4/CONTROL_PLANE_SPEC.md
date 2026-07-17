# MJRH V4 — Control Plane Specification v1.0
## The Sovereign Command Center

### 1. Responsibility
The Orchestrator of Sovereignties. The Control Plane provides a unified interface for Multi-Root administration. It manages the lifecycle of Sovereign Roots (Enterprises), standardizes capabilities across the ecosystem, and provides high-level observability for strategic decision-making.

### 2. Core Components

#### A. Enterprise Manager
- **Responsibility:** Creating and decommissioning Sovereign Roots (L1 Roots).
- **Rule:** Every Root created must be initialized with a Constitutional Identity and a Genesis Ledger.

#### B. Strategy Dispatcher
- **Responsibility:** Pushing "Standardized Templates" (DNA) to multiple roots.
- **Logic:** Allows a Holding company to enforce the same Laundry Blueprint or Finance Policy across 10 subsidiaries.

#### C. Consolidated Dashboard
- **Responsibility:** Aggregating L6 Metrics and L10 Mutations.
- **Rule:** Data aggregation is only possible for Actors with `HOLDING_ADMIN` mandate in the parent node.

### 3. Cross-Layer Contracts
- **L1 Dependency:** Operates at the topmost level of the organizational forest.
- **L2 Dependency:** Uses a special `SYSTEM_MANDATE` to manage cross-root configurations.
- **L5 Dependency:** Monitors the health and integrity of all child ledgers.

### 4. Architectural Invariants
- **[INV_HIERARCHICAL_PRIVACY]:** A child root can NEVER see parent or sibling data. The parent sees aggregated child data only via explicit L2 permission.
- **[INV_ATOMIC_PROVISIONING]:** Creating a new business root must be an atomic transaction across all 10 layers.
