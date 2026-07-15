# MJRH V4 — Layer 2 ER Diagram v3.0 (Forensic Grade)

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
```

## 3. Advanced Invariants
- **[INV_L2_CHAIN]:** No delegation loop allowed (A->B->C->A is blocked).
- **[INV_L2_CURRENCY]:** Financial limits require a verified Exchange Rate Fact (L3/L5).
- **[INV_L2_ACCOUNTABILITY]:** Every legal change records the `trace_id` of the governing Policy.
