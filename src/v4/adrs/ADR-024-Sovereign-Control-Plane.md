# ADR-024: Sovereign Control Plane and Consolidated Visibility

## Status
Proposed

## Context
In a massive enterprise ecosystem, we need to manage multiple independent Sovereign Roots (different legal entities) from a single administrative hub. However, we must not violate the core principle of "Sovereign Isolation" (L1). We need a way for the "Holding Company" to oversee "Subsidiaries" without merging their databases or leaking private operational data.

## Decision
1.  **Administrative Mirroring:** The Control Plane will exist as a **Meta-Layer**. It will use specialized RPCs that have the authority to query across Roots ONLY IF the Actor has a specific `CROSS_ROOT_AUDIT` mandate.
2.  **Standardization via Templates:** We will implement a "DNA Repository" in the Control Plane. When a Holding admin updates a "Standard Operating Procedure", the Control Plane will push "Mutation Proposals" (L10) to all child roots.
3.  **Consolidated Analytics:** We will create Materialized Aggregates for L6 metrics that are scoped to the Parent Node. These aggregates will store totals (e.g., total revenue, total SLA breaches) without exposing individual Work Order IDs or PII unless a deep forensic audit is triggered.
4.  **Identity Federation:** The Control Plane will link a single Global Identity (L1) to multiple Actors (L2) across different roots, allowing a CEO to switch "Sovereign Contexts" without re-authenticating.

## Technical Model
- **Control Schema:** `v4_control`.
- **Root Map:** `v4_control.enterprise_map` (parent_node_id, child_root_id).
- **Template Store:** `v4_control.global_dna_registry`.

## Consequences
- **Positive:** Centralized efficiency for multi-national conglomerates. Unified security monitoring.
- **Negative:** Highly sensitive layer; any breach in the Control Plane could potentially expose multiple roots (mitigated by L5 cryptographic signatures).
