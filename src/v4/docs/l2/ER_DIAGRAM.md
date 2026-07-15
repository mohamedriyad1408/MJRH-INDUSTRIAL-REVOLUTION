# MJRH V4 — Layer 2 ER Diagram v2.0 (Diamond Grade)

```mermaid
erDiagram
    IDENTITIES_L1 ||--|| LEGAL_ACTORS : "Existential Root"
    LEGAL_ACTORS ||--|| PERSONS : "Is Human"
    LEGAL_ACTORS ||--|| SERVICE_ACCOUNTS : "Is Machine"
    
    JOBS_GLOBAL ||--o{ POSITION_INSTANCES : "Defines"
    NODES_L1 ||--|| POSITION_INSTANCES : "Anchors"
    
    LEGAL_ACTORS ||--o{ ASSIGNMENTS : "Holds"
    POSITION_INSTANCES ||--o{ ASSIGNMENTS : "Contains"
    
    ASSIGNMENTS ||--o{ DELEGATIONS : "Extends Authority"
    ASSIGNMENTS ||--o{ SIGNATURE_RIGHTS : "Grants Power"
```

## 3. Integrity Constraints (Final)
- **[INV_L2_ACTOR]:** No mandate can be exercised by an un-anchored actor.
- **[INV_L2_CURRENCY]:** Financial authority is invalid without a matching L1 currency context.
- **[INV_L2_ORDER]:** Sequential signing must follow the `approval_priority` field.
