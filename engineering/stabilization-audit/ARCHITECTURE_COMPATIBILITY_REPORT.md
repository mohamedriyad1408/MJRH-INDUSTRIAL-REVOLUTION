# Architecture Compatibility Report

**Status:** Audit only — no implementation

## Core Issue

Current runtime is CI #239 frontend while the database remains evolved with additive Platform Foundation, Execution, Platform Services, SaaS, and Observability tables.

## Compatibility Matrix

| Component | Database Object | Severity | Compatibility | Safe Fix | Effort |
|---|---|---|---|---|---|
| Sidebar | `core_navigation_items`, `core_navigation_assets` | Medium | CI #239 likely ignores generated assets. | Keep legacy sidebar until adoption sprint. | Medium |
| Permission checks | `core_permission_*` | Medium | CI #239 uses role checks. | Gradual route permission adoption. | Medium |
| Orders | `orders`, `order_items`, `service_units` | Low | Historical tables intact. | Validate UI only. | Low |
| Work Orders | `work_orders`, `core_tasks` | Medium | New execution model ignored by CI #239. | Future bridge/adoption. | High |
| Stations | `workflow_stages`, `service_units` | Low-Medium | Old station model likely works. | Do not remove compatibility. | Medium |
| Accounting | `journal_entries`, new finance objects | Medium | Old accounting data intact; newer functions may have added rows. | Validate reports. | Medium |
| Forms | `core_forms`, new form tables | Low | Old UI mostly ignores. | Future adoption. | Medium |
| Documents | `core_document_templates` | Low | Old print components likely ignore. | Future adoption. | Medium |
| Reports | `report_definitions`, core reports | Medium | Component reports vs new definitions. | Validate. | Medium |
| Automation | `core_domain_events`, rules | Low | Old UI ignores. | Future adoption. | Medium |
| Billing | core billing + legacy billing | Medium | Possible mixed UI expectations. | Admin smoke. | Medium |
| Marketplace | core marketplace tables | Low | Old UI probably ignores. | Future adoption. | Low |
| Observability | core observability tables | Low | Old UI ignores. | Future admin UI. | Low |

## Database Compatibility Estimate

**Database Compatibility: 72%**

Reasoning: changes are mostly additive, but evolved functions/triggers and parallel models create medium operational risk.
