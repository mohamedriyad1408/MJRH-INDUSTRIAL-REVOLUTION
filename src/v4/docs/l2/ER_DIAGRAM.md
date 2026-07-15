# MJRH V4 — Layer 2 ER Diagram v1.1 (Hardened)

## 1. Physical Relationship Map (Mermaid)
```mermaid
erDiagram
    IDENTITIES_L1 ||--|| PERSONS : "Identity Extension"
    IDENTITIES_L1 ||--|| ORGANIZATIONS : "Sovereign Extension"
    NODES_L1 ||--|| POSITIONS : "Functional Anchor"
    
    PERSONS ||--o{ ASSIGNMENTS : "Mandated to"
    POSITIONS ||--o{ ASSIGNMENTS : "Occupied by"
    
    ASSIGNMENTS ||--o{ DELEGATIONS : "Authority Transfer"
    ASSIGNMENTS ||--o{ SIGNATURES : "Legal Attestation"
    
    POSITIONS ||--o{ POSITIONS : "Reports to (DAG)"
```

## 2. Integrity Guards (ERD Level)
- **Composite Sovereign Keys:** Every assignment references the Sovereign Root ID from L1 to prevent cross-tenant data bleed.
- **Materialized Chain of Command:** Positions use `ltree` for O(1) reporting line resolution and cycle prevention.
- **Immutable Succession:** The `assignments` table enforces a linked-list pattern for version history.
