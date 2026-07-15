# MJRH V4 — Layer 2 Domain Blueprint v1.2 (Audit Hardened)

## 1. Sovereign Identity Binding (FIXED: Isolation Leak)
- Every **Person** and **Organization** is physically bound to one **L1 Sovereign Root**.
- Cross-Sovereign assignments are strictly prohibited to prevent data/legal bleeding.

## 2. Functional Hierarchy (FIXED: Sovereign Desync)
- **Departments** and **Positions** derive their sovereign context dynamically from the L1 Node path.
- Moving a Node in L1 automatically updates the functional sovereignty in L2.

## 3. Reporting Integrity (FIXED: Reporting Loops)
- The Chain of Command must form a **Directed Acyclic Graph (DAG)**.
- A position cannot report to itself or any of its subordinates.

## 4. Temporal Integrity (FIXED: Overlaps & Amnesia)
- **Assignments:** Zero-tolerance for overlapping time windows for PRIMARY roles.
- **Metadata Versioning:** Changes to legal names or attributes trigger a version increment (Historical Persistence).
