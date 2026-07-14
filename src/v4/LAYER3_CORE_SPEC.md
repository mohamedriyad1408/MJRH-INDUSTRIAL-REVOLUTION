# MJRH V4 — Layer 3 Core Specification v1.0 (APPROVED)
## Operational Readiness & Capability Certification

### 1. Responsibility
The "Certifier" of business potential. It manages Capability Definitions, their specific Instances at Org-Units, and the Resources required to fulfill them. Its primary output is the **Readiness Certificate**.

### 2. Core Entities

#### A. Capability & Instance
- **Definition:** The abstract "How-to" bundle.
- **Instance:** The deployment of a Capability to an L1 Node.
- **Invariant:** Readiness is scoped to the Instance.

#### B. Resource Registry
- **Scope:** Anchored to L1 Nodes.
- **State:** Health, Availability, and Lifecycle tracking.

#### C. Competency Relation
- Links a Resource to a Capability with a proficiency level.

### 3. The Readiness Formula
Readiness = (Instance_Active) AND (Dependencies_Ready) AND (Resources_Available) AND (Resources_Healthy) AND (Competency_Valid) AND (Policy_Allowed).

### 4. Certification States
- `READY`
- `DEGRADED`
- `BLOCKED`
- `MISSING_DEPENDENCY`
- `INSUFFICIENT_CAPACITY`
- `POLICY_BLOCKED`
- `UNKNOWN`

### 5. Architectural Invariants
- **[INV_L1_DEPENDENCY]:** Every Instance and Resource must map to an L1 Node.
- **[INV_L2_DEPENDENCY]:** Readiness evaluation must invoke L2 logic for `POLICY_BLOCKED` state.
- **[INV_DAG]:** All capability instance dependencies must be acyclic.
