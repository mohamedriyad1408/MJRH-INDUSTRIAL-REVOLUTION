# Implementation Dependency Matrix

| Module | Depends On | Blocks | Blocked By | Notes |
|---|---|---|---|---|
| Permission Engine | Actor/Role model | Navigation, Runtime access | none | P0 foundation. |
| Generated Navigation | Permission Engine, Pack assets | Dry Tech visible parity, Generator | pack asset contract | First implementation target. |
| Pack Registry | Config loader | Templates, Generator | Core config loader | Required before mature packs. |
| Template Registry v2 | Pack Registry | Generator | pack registry | Existing registry is foundation. |
| Business DNA Resolver | Business DNA Registry | Initialization, Pack selection | none | Owner input bridge. |
| Work Order Engine | Entity registry, Workflow | Task Engine, Dry Tech bridge | core context | High risk. |
| Task Engine | Work Orders, Actors | Workflow execution | permission engine | High value. |
| Event Bus | Entity registry | Notifications, automation, reporting | core context | Needed for packs. |
| Financial Transaction Engine | Event bus, accounting rules | Accounting Pack | finance model | High risk. |
| Reporting Service | Entity registry, events | Dashboards, First Success | report definitions | Medium risk. |
| Dashboard Service | Reporting Service | First Success Dashboard | reporting | UX critical. |
| Notification Service | Event Bus | Messaging Pack, customer updates | event bus | Medium. |
| Document Engine | Forms, templates | invoices, checklists | config loader | Medium. |
| Business Initialization V2 | DNA resolver, generator | Self-service onboarding | generator services | High UX risk. |
| Organization Generator | Pack registry, templates, permissions, nav | all generated orgs | multiple core services | Critical path. |
| Dry Tech Recovery | nav, permissions, order bridge, reporting | Gold Standard parity | core/platform phases | Validates platform. |
