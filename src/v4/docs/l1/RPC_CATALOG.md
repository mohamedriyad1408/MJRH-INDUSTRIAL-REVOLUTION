# MJRH V4 — Layer 1 RPC Catalog

## v4_l1.resolve_sovereign_root(node_id)
- **Input:** UUID
- **Output:** JSONB {sovereign_id, path}
- **Logic:** Identifies the isolation boundary of any unit.

## v4_l1.resolve_hierarchy(node_id)
- **Input:** UUID
- **Output:** UUID[]
- **Logic:** Returns full ancestry array for visibility logic.
