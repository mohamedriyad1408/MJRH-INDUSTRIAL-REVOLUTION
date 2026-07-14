# MJRH Enterprise Meta-Model v1.0
## The Official Language of MJRH Business Operating System

### 1. Domain Entities
- **Organization:** The sovereign domain. Owns resources, identity, and law.
- **Org Unit (Node):** A structural point in the organization hierarchy (Site, Dept, Region).
- **Capability:** A business competence contract (e.g., "Financial Mastery", "Ops Execution").

### 2. Integrity & State
- **Domain Aggregate:** The primary business object with a lifecycle (e.g., Job, Contract).
- **Resource:** A provider of capacity (Human, Machine, Virtual, Material).
- **Party:** An external identity interacting with the domain (Customer, Vendor).

### 3. Execution Model
- **Work:** The value stream. (Process -> Job -> Operation).
- **State:** The specific condition of an Aggregate at a point in time.
- **Event:** The atomic, immutable fact. The primary source of truth.

### 4. Governance
- **Policy:** Rules, constraints, and compliance guardrails.
- **Artifact:** Business evidence/output (Document, File, Digital Proof).
- **Hook:** Integration points for automated business logic.
