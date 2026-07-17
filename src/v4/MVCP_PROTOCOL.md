# MJRH V4 CERTIFICATION PROTOCOL (MVCP)
## Version 2.2 — Forensic-Grade Execution Classification

---

### 0. THE REVISED EVIDENCE MATRIX (ELM v2.2)
To maintain scientific accuracy, Level 3 is now subdivided based on the execution environment:

| Level | Name | Definition | Environment |
| :--- | :--- | :--- | :--- |
| **L3A** | Certified Simulator | Logical reproduction in a non-target environment (e.g. JS/Node.js). | Simulator |
| **L3B** | Real Target Execution | Successful execution on a real PostgreSQL/Supabase engine. | Laboratory DB |
| **L4** | Repeatable Exploit | Stable, cross-environment bypass. | Multiple Target DBs |
| **L5** | Formal Proof | Mathematical/Statutory verification of correctness. | Formal Model |

---

### 1. THE TRUTH IN LABELING RULE
- Reports using **L3A** evidence must explicitly use the term **"Confirmed in Simulation"**.
- The verdict **"SYSTEM BREACHED"** is reserved for **L3B** and above. 
- Findings at **L3A** are classified as **"Critical Logical Vulnerability (Simulated)"**.

---

### 2. SIMULATOR INTEGRITY MANDATE
Every L3A finding must include the **Simulation Artifact**:
1.  **Logic Mapping:** How the SQL logic was translated to the simulator.
2.  **Raw Script:** The full source code of the simulator.
3.  **IO Trace:** Raw stdout/stderr of the simulation execution.
