# MJRH V4 — Layer 2 Domain Blueprint v1.3 (Post-Audit)

## 1. Party & Sovereign Binding
- **Identity Binding:** Identities must be formally registered to a Sovereign Root BEFORE any functional assignment. 
- **Atomic Registration:** Registration uses a Mutex to prevent cross-sovereign race conditions.

## 2. Functional Hierarchy Optimization
- **Job Definition:** Global template for a role (e.g., "Senior Accountant").
- **Position Instance:** The actual seat in the Org-Tree (e.g., "Senior Accountant at Branch X").
- **Rule:** Position Instances are unique to an L1 Node.

## 3. Reporting & Command
- **Isolation:** Reporting lines (Direct/Matrix) are strictly contained within a single Sovereign Root.
- **Integrity:** Self-reporting or circular references are blocked by a recursive invariant check.
