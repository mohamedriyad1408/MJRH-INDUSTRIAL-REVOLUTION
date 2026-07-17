# MJRH V4 — Layer 9 Core Specification v0.1
## Universal API & Gateway Layer (The Embassy)

### 1. Responsibility
The External Interface of the Enterprise. Layer 9 is responsible for managing all inbound and outbound communication with external non-Sovereign entities. It acts as a protocol translator and a security firewall for the OS Core.

### 2. Core Components

#### A. API Key Manager
- **Responsibility:** Provisioning and rotation of cryptographically hashed keys.
- **Binding:** Every key is bound to exactly one Org-Node (L1) and a whitelist of Capabilities (L3).

#### B. Webhook Dispatcher
- **Responsibility:** Pushing operational facts from the Pulse Engine (L4) to external URL endpoints.
- **Guarantee:** At-least-once delivery with exponential backoff.

#### C. Inbound Transformer
- **Responsibility:** Receiving external signals (JSON/XML) and mapping them into canonical Layer 4 Work Order payloads.

### 3. Cross-Layer Contracts
- **L1 Dependency:** API Keys are scoped to a structural node.
- **L3 Dependency:** Permissions are validated against "Activated Capabilities".
- **L4 Dependency:** Inbound signals trigger `fn_execute_pulse`.
- **L5 Dependency:** Every external API call/webhook emission is logged in the Evidence Ledger.

### 4. Architectural Invariants
- **[INV_CAPABILITY_GATE]:** An external key cannot access any logic not explicitly defined in the node's L3 activations.
- **[INV_EXTERNAL_ISOLATION]:** External clients have zero visibility into the internal `ltree` structure of L1.
- **[INV_IDEMPOTENCY]:** All inbound signals must provide a `trace_id` to prevent duplicate pulses in L4.
