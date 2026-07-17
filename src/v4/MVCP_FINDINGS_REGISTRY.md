# MJRH V4 — CENTRAL FINDING REGISTRY
## Certification Stream: V4-CORE-GENESIS

| ID | Severity | Discovery Stage | ELM Level | Status | Confidence | Title |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MVCP-F001** | CRITICAL | Stage 2 | L2 (Trace) | OPEN | 85% | Potential RLS Update Bypass in work_orders |
| **MVCP-F002** | HIGH | Stage 2 | L1 (Static) | OPEN | 70% | Undefined Recursive Depth in L3 Readiness |
| **MVCP-F003** | MEDIUM | Stage 2 | L2 (Trace) | OPEN | 90% | Missing Readiness Certification in Provisioning |

---

### **Finding Card: MVCP-F001**
- **Artifact:** `MJRH-INDUSTRIAL-REVOLUTION/supabase/migrations/v4_l4/006_v4_l4_security.sql`
- **Logic:** `FOR ALL` policy on `work_orders` table.
- **Hypothesis:** Malicious `UPDATE` can bypass `fn_execute_pulse`.
- **Required Proof (L3):** Execution of manual update using a non-owner JWT.

### **Finding Card: MVCP-F002**
- **Artifact:** `v4_l3/fn_evaluate_readiness.sql`
- **Logic:** `WITH RECURSIVE` without cycle detection.
- **Hypothesis:** Infinite loop on circular dependency.
- **Required Proof (L3):** Insert `A -> B -> A` into `capability_dependencies` and trigger eval.
