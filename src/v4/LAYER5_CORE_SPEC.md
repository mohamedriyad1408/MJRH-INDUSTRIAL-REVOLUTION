# MJRH V4 — Layer 5 Core Specification v0.1
## Evidence Layer (The Archive)

### 1. Responsibility
The Permanent Record of the Enterprise. Layer 5 is responsible for the immutable storage and verification of all operational facts emitted by the Pulse Engine (Layer 4). It provides the definitive source of truth for audits, legal compliance, and financial reconciliation.

### 2. Core Components

#### A. Evidence Ledger (The Vault)
- **Table:** `v4_l5.evidence_ledger`
- **Responsibility:** Append-only storage of finalized operational facts.
- **Constraints:** No UPDATE or DELETE operations allowed.

#### B. Integrity Verifier
- **Responsibility:** Ensures the sequence of pulses is unbroken.
- **Rules:** Detects missing pulses or unauthorized gaps in the job lifecycle.

#### C. Sovereign Access View
- **Responsibility:** Secure, read-only access to facts partitioned by L1 Sovereign Roots.

### 3. Cross-Layer Contracts
- **L4 Dependency:** Consumes facts from the Layer 4 Outbox.
- **L1 Dependency:** Every record is tagged and partitioned by Sovereign Identity.
- **L2 Dependency:** Records contain the L2 Mandate context used during the pulse.

### 4. Architectural Invariants
- **[INV_IMMUTABILITY]:** Once a fact is committed to the Ledger, it can never be altered or removed.
- **[INV_FULL_LINEAGE]:** Every work order must have a traceable path from genesis to finality.
- **[INV_SOVEREIGN_PARTITION]:** Evidence must be physically or logically partitioned to prevent cross-root data exposure during audits.
