# 02. PRODUCT STRATEGY & ARCHITECTURE ROADMAP
**Target Audience:** Engineering Leads, Product Managers & Operations Teams  
**Purpose:** Strategic roadmap for architectural evolution, feature definition, technical trade-offs, and scaling constraints.

---

## 1. Architectural Vision & Scope
MJRH is designed as a vertical SaaS operating system for commercial laundry facilities. The primary design goal is to unify physical garment handling with financial accounting and workforce administration within a single data model, removing the friction between operational execution and accounting reconciliation.

```
+-----------------------------------------------------------------------+
|                       EXECUTIVE & ANALYTICS TIER                      |
|         Executive Dashboard | AI Laundry Advisor | Benchmarking       |
+-----------------------------------------------------------------------+
                                   |
+----------------------------------+------------------------------------+
|                UNIFIED DATA LAYER (Pl/pgSQL + Query Layer)            |
+----------------------------------+------------------------------------+
                 |                                      |
+----------------+----------------+   +-----------------+---------------+
|        PHYSICAL WORKFLOW        |   |       FINANCIAL GOVERNANCE      |
|  Reception -> Clean -> Dry ->   |   |  Double-Entry Journal Entries   |
|  Iron -> Pack -> QC -> Delivery |   |  Daily Cash Closing | APDO Audit  |
+---------------------------------+   +---------------------------------+
```

---

## 2. Core Feature Specifications & Evolution

### 2.1. The APDO Governance Framework
All operational mutations must strictly implement the **APDO** pattern to ensure complete forensic accountability:
* **Actor (A):** Captures the exact authenticated entity (UUID) and role (`AppRole`) executing the transition.
* **Process (P):** Explicitly defines the business logic context (e.g., `cash_transfer`, `qc_rejection`, `order_cancellation`).
* **Data (D):** Immutable snapshot of transactional state (quantities, amounts, geolocation coordinates, OCR metadata).
* **Output (O):** Enforces mandatory downstream generation of double-entry journal entries, cash balance modifications, and event notifications.

### 2.2. Workstation Progression & Exception Gates
* **Garment Type Engine:** Garment profiles (`GARMENT_PROFILES` in `lib/rules/workflow-engine-v1.ts`) define routing characteristics (`need_wash`, `need_dry`, `need_iron`, `need_dry_clean`, `need_qc`, `need_packaging`). Wash-only items bypass ironing validation gates to eliminate workflow deadlocks.
* **Suit & Set Management:** Garment sets (e.g., 2-piece or 3-piece suits) maintain independent QR codes per item (`QR-XXXX-P1`, `QR-XXXX-P2`) linked under a parent `set_id` to preserve unit integrity during washing while ensuring consolidated final packaging.
* **QC Rejection Destinations:** Rejected items are assigned explicit fallback stages (`cleaning`, `ironing`, `packing`, `qc_hold`) with mandatory rejection explanations and automated rework incrementation.

### 2.3. Customer Care & Exception Accounting
* **Rework Orders:** Rework requests generate independent linked records (`#1025-R1`, `#1025-R2`) with zero billing impact, preserving the integrity of the original order's financial ledger.
* **Overpayment & Courier Tip Separation:** Bank transfers exceeding invoice totals are automatically split into two separate ledger events:
  1. `order_payment`: Closes Accounts Receivable (`1100`) against Cash/Bank (`1000`) for the exact invoice total.
  2. `driver_tip`: Records the excess as an accrued employee payable liability (`2065/2100`) to be disbursed during daily cash closing.

---

## 3. Technical Trade-Offs & Constraints

### 3.1. Client-Side vs. Edge Computation
* **Trade-Off:** Currently, complex UI state simulations (such as the interactive verification display in `routes/customer-portal.tsx`) execute client-side in React state before dispatching REST mutations to Supabase.
* **Constraint:** While this minimizes perceived latency and optimizes mobile UX, it introduces potential state desynchronization if network connectivity fails mid-mutation.
* **Mitigation:** Future roadmap phases will shift the ultimate database confirmation step entirely to Supabase Edge Functions (`Deno.serve`), ensuring database transactions execute atomically.

### 3.2. Single-Page App (SPA) Bundle Scaling
* **Trade-Off:** Shipping 9 comprehensive language dictionaries and charting libraries within a Vite SPA architecture increases baseline JavaScript payload sizes.
* **Constraint:** Strict adherence to the 450KB chunk budget requires manual chunk splitting and aggressive lazy loading of non-critical administrative routes.

---

## 4. Future Roadmap Tiers
1. **True Asynchronous Offline Queue:** Implement IndexedDB caching and ServiceWorker background sync to support continuous workstation scanning during transient network disconnects.
2. **Enterprise Branch Transfers:** Implement dedicated inventory and garment transfer manifests between distinct operational branches.
3. **Automated Bank Statement Reconciliation:** Introduce direct MT940/CAMT.053 bank feed ingestions to replace visual OCR verification for enterprise clients.
