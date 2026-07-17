# MJRH V4 — Layer 7 Core Specification v0.1
## Dynamic Interface Layer (The Lens)

### 1. Responsibility
The Visual Projection of the Enterprise. Layer 7 is responsible for generating dynamic user interfaces based on the metadata and state provided by Layers 1-6. It ensures that the interface is always a reflection of the current "Digital Twin" of the organization.

### 2. Core Components

#### A. Layout Generator
- **Responsibility:** Mapping Org-Nodes (L1) and Capabilities (L3) to navigation and layout structures.
- **Rule:** Layouts are derived from the `node_class` and `activated_capabilities`.

#### B. Activity Form Engine
- **Responsibility:** Rendering dynamic forms for Layer 4 Activities based on L3 requirement manifests and L2 mandate fields.
- **Persistence:** `v4_l7.form_schemas`.

#### C. Sovereign Dashboard Engine
- **Responsibility:** Projecting L6 Health Scores and L5 Fact Streams into visual monitors.
- **Rule:** Data visibility is strictly gated by L1/L2 sovereign context.

### 3. Cross-Layer Contracts
- **L1 Dependency:** Navigation is built from the `node_path`.
- **L2 Dependency:** UI elements (buttons/actions) are enabled/disabled based on active Mandates.
- **L3/L4 Dependency:** Form inputs are generated from Activity-Capability links.
- **L6 Dependency:** Monitors and alerts are fed by the Observability stream.

### 4. Architectural Invariants
- **[INV_METADATA_DRIVEN]:** No UI component shall contain hardcoded business logic; all behavior must be projected from lower-layer metadata.
- **[INV_LENS_ISOLATION]:** The UI layer cannot perform any data modification except via Layer 4 Pulse RPCs.
- **[INV_MANDATE_VISIBILITY]:** An Actor must not see any UI element for which they do not have a corresponding L2 Authority.
