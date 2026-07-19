# Architecture Bypass Report

**Status:** Architecture Recovery Audit — no implementation

## Bypass categories

| Bypass | Current Evidence | Impact | Replacement | Priority |
|---|---|---|---|---|
| Static sidebar | `components/app-sidebar.tsx` still has `tenantGroups/adminGroups` fallback. | UI can bypass Capability Registry navigation. | Generated Navigation Assets only after parity. | P0 |
| Route role checks | `routes/$tenant.tsx`, route files, `hasRole` usage. | Authorization can bypass Permission Engine. | `actor_has_permission` and action guards. | P0 |
| Station routes | `routes/$tenant/stations/*.tsx`. | Workflow/Station behavior bypasses Work Area bridge. | Generic Work Area renderer. | P1 |
| Order-only execution | `routes/$tenant/orders/*`, service_units. | Work Order/Task model not yet primary. | Historical bridge + Work Order bridge adoption. | P0 |
| Component-coded reports | report/dashboard routes. | Reporting bypasses Report Asset engine. | Report/Dashboard definitions. | P1 |
| Component-coded documents | `print-invoice.tsx`, order detail. | Documents bypass Document Template Engine. | Document Template Engine adoption. | P1 |
| Notification triggers in code | notification center, WhatsApp helper. | Messaging bypasses Automation/Event Engine. | Event-driven Notification Pack. | P1 |
| Demo scripts | seed/reference scripts. | Generation can bypass Platform Generator. | Demo Data Import governed by Generator. | P2 |
| Legacy bootstrap | seed tenant defaults functions/migrations. | Hidden mutations bypass manifest/generator. | Template-aware lifecycle/provisioning. | P0 |

## Conclusion

The Platform Foundation exists, but multiple runtime modules still bypass it. Sprint 4F should not restore old code; it should progressively route each module through Capability Registry, Asset Pipeline, Permission Engine, Work Order/Task Engine, Dynamic Forms, Documents, Reports, and Automation.
