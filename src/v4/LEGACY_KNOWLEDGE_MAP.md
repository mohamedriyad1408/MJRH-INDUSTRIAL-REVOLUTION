# MJRH V4 — Legacy Knowledge Map (LKM)
## Extracting V2 (Dry-tech) Operational DNA into V4 Sovereign OS

### 1. Financial Heartbeat (The "Double-Entry" Invariant)
- **V2 Artifact:** `public.sync_order_financials` (Trigger-based synchronous accounting).
- **V2 DNA:** Mapping every business status change to a specific Journal Entry (Debit: Cash/Receivable, Credit: Revenue).
- **V4 Mapping:**
    - **L3 Capability:** `financial.double_entry_sync`.
    - **L4 Pulse Pattern:** Every `v4_l4.pulse` on a "Commercial" Activity will trigger a `FINANCIAL_SYNC` Pulse.
    - **L5 Fact:** Financial entries are now part of the immutable chain, preventing the "manual credit bypass" vulnerability.

### 2. Operational Load Balancing (The "Fairness" Invariant)
- **V2 Artifact:** `public.rebalance_ironing_assignments` (Dynamic distribution based on current load).
- **V2 DNA:** Weighted distribution of work based on `piece_count` and technician "Attendance".
- **V4 Mapping:**
    - **L3 Resource Model:** Resource "Availability" is derived from L2 Assignments + L3 Health.
    - **L4 Auto-Routing:** When a Work Order enters a "Processing" activity, L4 calls L3 to resolve the "Least Loaded Actor" with the appropriate Mandate.

### 3. Structural Isolation (The "Sovereign" Invariant)
- **V2 Artifact:** `public.can_access_tenant(tid)`.
- **V2 DNA:** Basic RLS isolation based on UUID.
- **V4 Mapping:**
    - **L1 Topology:** Upgraded from UUID to `ltree` path-based isolation.
    - **L2 Hardening:** Access is now derived from `v4_l2.assignments`, allowing for "Delegated" or "Acting" access which was missing in V2.

### 4. UI/UX Projection (The "Station Board" Pattern)
- **V2 Artifact:** `StationBoard.tsx` and its real-time filters.
- **V2 DNA:** A visual grid that group items by their current status and time-in-stage.
- **V4 Mapping:**
    - **L7 Projection:** The `v4_l7.fn_v_get_actor_navigation` will generate a "Station Board" layout automatically for any node marked as `SOVEREIGN_UNIT`.

---

### **Summary of Knowledge Extraction**
We are not porting the **code** (which is monolithic); we are porting the **logic** (which is brilliant). V2 is the "Operational Manual" for V4.

**Certification Verdict on LKM:**
- **Status:** **DRAFT v0.1**
- **Priority:** **HIGH**
- **Next Pulse:** Build the V4-compliant version of `sync_order_financials` as a Generic Capability.
