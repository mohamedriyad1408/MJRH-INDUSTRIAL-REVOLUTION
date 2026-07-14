# MJRH V4 — Layer 1 RPC Contracts

## resolve_sovereign_root(target_node_id: UUID)
- **Purpose:** Identify the data isolation boundary.
- **Input:** target_node_id (UUID)
- **Output:** JSONB { sovereign_id: UUID, path: ltree }
- **Errors:** 
  - P1101: PARENT_NOT_FOUND (if orphaned)
  - Returns NULL if node does not exist.

## resolve_hierarchy(target_node_id: UUID)
- **Purpose:** Full structural breadcrumb for visibility logic.
- **Input:** target_node_id (UUID)
- **Output:** TEXT[] (Array of node UIDs from root to leaf)
