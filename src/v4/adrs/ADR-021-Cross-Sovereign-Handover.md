# ADR-021: Cross-Sovereign Handover Protocol

## Status
Proposed

## Context
In a large enterprise (100k+ employees), work often moves between different legal entities or independent business units (Sovereign Roots). While Layer 1 ensures isolation, we need a mechanism to "bridge" work (Work Orders) across these boundaries without creating a monolithic, unmanageable mess or violating data privacy.

## Decision
1.  **Protocol-Based Transfer:** We will implement a **Handover Pulse**. Instead of a simple `UPDATE node_id`, a handover is a specific transition that involves:
    *   **Departure Fact (Root A):** Recording the exit from the source root.
    *   **Transit State:** A temporary, neutral state in Layer 4.
    *   **Admission Pulse (Root B):** The receiver must "admit" the work order, verifying its own L2/L3 readiness.
2.  **Sovereign Envelope:** The Work Order payload is wrapped in a "Sovereign Envelope" during transit. Root B only sees the fields Root A explicitly marked as `EXPORTABLE`.
3.  **Audit Trail:** The L5 Ledger will link the Departure Fact from Root A with the Admission Fact from Root B using a shared `transit_id`.

## Technical Model
- **Handover Registry:** `v4_l8.handovers` (id, work_order_id, from_node_id, to_node_id, status).
- **Handover Pulse:** `fn_v_execute_handover(work_order_id, target_node_id, sender_actor_id)`.

## Consequences
- **Positive:** Preserves total sovereign isolation while allowing collaborative value streams.
- **Negative:** Handover is a 2-step process (Send/Accept), which may increase operational latency.
