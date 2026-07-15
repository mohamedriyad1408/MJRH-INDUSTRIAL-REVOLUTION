# MJRH V4 — Layer 2 ER Diagram v3.1 (Cohesion Hardened)

```mermaid
erDiagram
    IDENTITIES_L1 ||--|| LEGAL_ACTORS : "Sovereign Root"
    LEGAL_ACTORS ||--|| PERSONS : "Bio-Data (Encrypted)"
    LEGAL_ACTORS ||--|| SERVICE_ACCOUNTS : "Logic-Data"
    
    JOBS_GLOBAL ||--o{ POSITION_INSTANCES : "Defines"
    NODES_L1 ||--|| POSITION_INSTANCES : "Anchors"
    
    LEGAL_ACTORS ||--o{ ASSIGNMENTS : "Occupies (Versioned)"
    POSITION_INSTANCES ||--o{ ASSIGNMENTS : "Holds (Versioned)"
    
    ASSIGNMENTS ||--o{ DELEGATIONS : "Recursive Links"
    ASSIGNMENTS ||--o{ SIGNATURE_RIGHTS : "Fingerprinted"
    
    ASSIGNMENTS ||--o| ASSIGNMENTS : "Successor (Succession Link)"
    REPORTING_LINES ||--|| LEGAL_ACTORS : "Contains Precedence Weight"
```

## 3. Cohesion Rules
- **[INV_L2_ACCOUNTABILITY]:** Every legal change records the `trace_id` of the governing Policy and the `actor_id`.
- **[INV_L2_SUCCESSION]:** Assignments form an immutable chain via `successor_id`.
