# MJRH Architecture Review Checklist

**Status:** Mandatory checklist — pending review  
**Purpose:** Every Pull Request must answer these questions before approval.

---

## 1. Mandatory Questions

Every PR must answer:

1. Does this belong to the Core?
2. Can another industry reuse it?
3. Is it configurable?
4. Does it respect the Business Operating Model?
5. Does it respect the Business DNA?
6. Does it respect the Business Knowledge Model?
7. Does it use official Business Glossary terminology?
8. Does it follow the Naming Convention?
9. Does it avoid hardcoded industry behavior?
10. Does it avoid technical language in customer-facing UI?
11. Does it introduce technical debt?
12. Has it been validated against Dry Tech?
13. Would this still work if Laundry disappeared?
14. Does it preserve relationships and data integrity?
15. Does it make the platform more reusable, not more specialized?

---

## 2. Stop Rule

If any answer is NO:

```txt
Stop implementation and redesign.
```

---

## 3. Required PR Notes

Each PR must include:

- business concept being changed
- affected Business Knowledge Model entities
- affected Operating Model characteristics
- affected Business DNA dimensions
- affected Capability Packs
- affected Templates
- configuration changes
- Dry Tech validation result
- migration impact, if any
- rollback plan

---

## 4. Dry Tech Validation

Before approval, the PR must prove:

- Dry Tech still opens
- dashboards still load
- orders/work orders/tasks still work as applicable
- financial/reporting areas still work as applicable
- historical data is not corrupted
- reference/gold standard behavior is preserved

---

## 5. Customer Language Check

If the PR changes UI text, confirm:

- no tenant/schema/RPC/migration/RLS language
- no developer TODOs
- no debug wording
- no internal architecture language
- business owner can understand the screen

---

## 6. Final Approval Rule

Architecture review is not optional.

A PR that bypasses this checklist cannot be merged into `main`.
