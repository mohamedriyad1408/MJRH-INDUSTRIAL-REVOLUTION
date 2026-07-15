# MJRH V4 — Layer 2 ER Diagram v4.2 (Coherent)

```mermaid
erDiagram
    IDENTITIES_L1 ||--|| ACTORS : "Sovereign Root"
    ACTORS ||--o| PERSONS : "Bio-Data"
    ACTORS ||--o| SERVICE_ACCOUNTS : "System-Data"
    
    NODES_L1 ||--|| POSITIONS : "Structural Anchor"
    
    ACTORS ||--o{ ASSIGNMENTS : "Occupies"
    POSITIONS ||--o{ ASSIGNMENTS : "Holds"
    
    ASSIGNMENTS ||--o| ASSIGNMENTS : "Predecessor (Lineage)"
    ASSIGNMENTS ||--o{ DELEGATIONS : "Recursive Transfer"
```

## 3. Cohesion Constants
- `sovereign_root_id`: Present in every table.
- `version`: Sequential BigInt.
- `lifecycle_status`: Enum (DRAFT, ACTIVE, SUSPENDED, ARCHIVED).
