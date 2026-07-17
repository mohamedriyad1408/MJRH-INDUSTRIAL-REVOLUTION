# ADR-017: Layer 4 Runtime Execution Architecture

## Status
Draft

## Context
Layer 4 (The Pulse) is the runtime engine of the MJRH V4 Business Operating System. While Layers 1-3 provide the structural, legal, and resource foundation, Layer 4 is responsible for the actual flow of value-creating work. It must orchestrate transitions across activities while strictly adhering to the immutability and isolation constraints of the lower layers.

## Decision
We will implement a **Deterministic Pulse Engine** based on the following principles:

1.  **Sovereign Anchoring:** Every `Work Order` (Job) must be anchored to a specific Node ID from Layer 1. Cross-node movement is only allowed through explicit handover protocols.
2.  **Value Stream Blueprints:** Business processes are defined as `Blueprints` containing `Activities`. These are decoupled from the Work Orders to allow for versioning and hot-swapping.
3.  **The "Pulse" Mechanism:** Every state transition in a Work Order is considered a "Pulse". A Pulse is valid ONLY if:
    *   **L2 Validation:** The Actor performing the transition has a valid Mandate for the action.
    *   **L3 Certification:** The target Activity's dependency requirements (readiness) are met.
4.  **Fact Outbox:** Layer 4 will not store historical audit trails in its primary tables. Instead, every successful Pulse emits an `Operational Fact` to an Outbox table, which feeds Layer 5 (Evidence).

## Technical Model
- **Work Order Aggregate:** `v4_l4.work_orders` (uuid, node_id, blueprint_id, current_activity_id, status, payload).
- **Blueprint Repository:** `v4_l4.blueprints` and `v4_l4.activities`.
- **Pulse Trigger:** `v4_l4.fn_execute_pulse(work_order_id, target_activity_id, actor_id, payload)`.

## Consequences
- **Positive:** Guarantees that no work is done without L2/L3 compliance.
- **Negative:** Increased latency due to recursive L3 checks during high-frequency transitions (mitigated by L3 caching).
- **Constraint:** Layer 4 cannot modify Layer 3 capacity directly; it must request a "Reservation" from L3 during the Pulse.
