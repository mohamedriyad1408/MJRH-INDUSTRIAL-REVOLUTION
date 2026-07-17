# ADR-023: Safe Self-Mutation and Evolutionary Protocol

## Status
Proposed

## Context
A business operating system for 100k+ employees cannot remain static. It must adapt to market conditions and internal performance. However, "automated AI adjustments" carry extreme risk. We need a protocol that allows the system to evolve while remaining under strict legal and structural control.

## Decision
1.  **Human-in-the-Loop by Default:** All L10 mutations are initially `PROPOSALS`. They must be approved by an L2 Actor with the correct Authority Class before being "Injected".
2.  **Autonomous Zones:** Sovereign Roots can explicitly authorize "Autonomous Zones" where specific L10 mutations (e.g., dynamic SLA adjustments) are applied automatically within a pre-defined range.
3.  **Shadow Injection:** Proposed mutations are first run in "Shadow Mode"—L10 records what *would* have happened, providing evidence to the L2 approver.
4.  **Pulse Versioning:** When a policy or blueprint is mutated, the version in L4 is bumped. Open Work Orders continue on the old version, while new ones adopt the mutated version.

## Technical Model
- **Mutation Store:** `v4_l10.mutations` (id, target_layer, target_id, patch_data, status).
- **Inference Log:** `v4_l10.inferences` (pattern_detected, confidence_score, suggested_mutation_id).

## Consequences
- **Positive:** Massive reduction in manual management overhead. Continuous improvement is baked into the OS.
- **Negative:** Highly complex to implement "Safe Rollbacks" across 10 layers.
