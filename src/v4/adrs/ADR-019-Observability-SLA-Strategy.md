# ADR-019: Layer 6 Observability and SLA Monitoring Strategy

## Status
Proposed

## Context
A 100k+ employee enterprise requires real-time monitoring of millions of concurrent jobs. We need to detect SLA breaches and health degradation without impacting the performance of the Pulse Engine (Layer 4).

## Decision
1.  **Asynchronous Monitoring:** Layer 6 will primarily operate using the **"After-Pulse" pattern**. It will react to `outbox_facts` (L4) or `evidence_ledger` (L5) entries rather than hooking directly into L4 transactions.
2.  **SLA Definitions:** SLAs are defined at the **Activity level** within a Value Stream.
3.  **Health Scoring Algorithm:** Health scores are computed as a composite:
    *   `Compliance (40%)`: From L5 Integrity checks.
    *   `SLA (40%)`: From L6 Pulse timing.
    *   `Resource (20%)`: From L3 Resource health.
4.  **Persistence:** Use `v4_l6` schema for active alerts and aggregated metrics. Historical metrics will be aggregated periodically to reduce L4 query load.

## Technical Model
- **SLA Policy:** `v4_l6.sla_policies` (activity_id, max_duration).
- **Active Breach:** `v4_l6.sla_breaches` (work_order_id, activity_id, breach_at).
- **Node Health:** `v4_l6.node_health_scores` (node_id, score, computed_at).

## Consequences
- **Positive:** Zero performance impact on the execution pulse. Clear, auditable metrics.
- **Negative:** Near-real-time (milliseconds delay) rather than instantaneous detection.
