# MJRH V4 — Layer 8 Core Specification v0.1
## Interoperability & Handover Layer (The Bridge)

### 1. Responsibility
The Connector of Sovereignties. Layer 8 is responsible for managing the interaction between different Sovereign Roots (cross-company) and between the MJRH OS and external systems (APIs, IoT, Financial Gateways). It ensures that "Sovereign Isolation" is maintained even during data exchange.

### 2. Core Components

#### A. Handover Protocol
- **Responsibility:** Managing the transfer of Work Orders (L4) between distinct structural roots.
- **Rule:** A Handover is an atomic transaction requiring dual-L2 mandates (Sender/Receiver).

#### B. Universal API Gateway
- **Responsibility:** Providing a secure, capability-based interface for external machines/services.
- **Persistence:** `v4_l8.integration_keys`.

#### C. Sanitization Engine
- **Responsibility:** Scrubbing metadata and payloads during cross-root transfers to prevent "Information Leaks" (INV_SOVEREIGN_LEAK).

### 3. Cross-Layer Contracts
- **L4 Dependency:** Operates on the state of Work Orders.
- **L1/L2 Dependency:** Handover requires explicit structural nodes and authorization signatures.
- **L5 Dependency:** Every Handover event is a "High-Priority Fact" in the Evidence Ledger.

### 4. Architectural Invariants
- **[INV_EXPLICIT_HANDOVER]:** Data never leaves a Sovereign Root unless an explicit Handover Pulse is executed.
- **[INV_GATEWAY_ISOLATION]:** External keys are strictly bound to a single Org-Node (L1) and a subset of Capabilities (L3).
- **[INV_IMMUTABLE_TRANSIT]:** A record of the handover state must be signed by both roots in Layer 5.
