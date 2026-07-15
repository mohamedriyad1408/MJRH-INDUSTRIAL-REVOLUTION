# MJRH V4 — Layer 1 Operational Readiness Guide

## 1. Monitoring Strategy
- **Metric [Fact Lag]:** Monitor `v_l1_outbox_telemetry`. Alert if `max_lag > 5 minutes`.
- **Metric [Lock Wait]:** Monitor PostgreSQL `pg_stat_activity` for waits on `pg_advisory_xact_lock`.
- **Metric [Integrity]:** Schedule `fn_check_topology_health()` to run weekly.

## 2. Maintenance Procedures
- **GiST Index Bloat:** Reindex `idx_nodes_path_gist` if performance for hierarchy resolution exceeds 5ms.
- **Outbox Purge:** Archive `structural_outbox` records where `published = true` and `created_at < now() - interval '30 days'`.

## 3. Thresholds (SLA)
- **Context Resolve:** < 2ms (99th percentile).
- **Subtree Move:** < 500ms (95th percentile) for up to 500 nodes.
