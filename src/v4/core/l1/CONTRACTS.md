# MJRH V4 — Layer 1 RPC Contracts

## resolve_sovereign_root(target_node_id: UUID)
- **Purpose:** Identifies the data isolation boundary for a given node.
- **Input:** `_node_id` (UUID)
- **Output:** `JSONB { sovereign_id: UUID, path: text }`
- **Error States:** Returns NULL if node not found.

## resolve_hierarchy(target_node_id: UUID)
- **Purpose:** Returns the array of node IDs representing the full ancestry path.
- **Input:** `_node_id` (UUID)
- **Output:** `TEXT[]`
