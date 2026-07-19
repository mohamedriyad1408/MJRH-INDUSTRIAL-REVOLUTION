# Dry Tech Recovery Plan

**Status:** Implementation order only — not execution.

| Capability | Current State | Evidence Source | Target Architecture | Dependencies | Migration Strategy | Validation | Definition of Done | Priority |
|---|---|---|---|---|---|---|---|---|
| Navigation parity | simplified generated nav. | AppSidebar, Gap Analysis. | Core nav + pack assets. | permission mapping. | add generated assets, keep static fallback. | owner sees expected areas. | Dry Tech nav restored without static source of truth. | P0 |
| Permissions parity | user_roles + core_roles parallel. | user_roles/core_roles. | Core permission mapping. | nav engine. | map roles non-destructively. | role access tests. | owner/manager/employee/courier access works. | P0 |
| Order continuity | historical orders preserved. | order routes/tables. | Order Pack + Work Order bridge. | Work Order engine. | compatibility bridge; no historical mutation. | open/edit/new order. | orders usable while bridge exists. | P0 |
| Work execution | legacy station/service-unit model. | station files, service_units. | Work Order/Task + Workflow Pack. | task engine. | bridge, not forced data rewrite. | stage/task validation. | new work executes generically. | P0 |
| Station rendering | station-specific routes. | station route files. | generic work-area renderer + Laundry Template assets. | workflow pack. | gradual route fallback. | station screens parity. | no station hardcoding needed for new templates. | P0 |
| Reports/dashboards | component-coded. | dashboard/report routes. | Reporting/Dashboard Pack. | report service. | define assets, use existing components as evidence. | reports load. | dashboards generated/configurable. | P1 |
| Notifications | helpers/messages exist. | notification center, WhatsApp. | Notification Pack. | event bus. | event/template extraction. | messages queued/sent. | triggers configurable. | P1 |
| Accounting | history preserved, order-specific sync. | finance routes/journals. | Accounting Pack + Financial Transaction Core. | finance engine. | bridge without rewriting history. | reports/journals pass. | order/work-order finance supported. | P1 |
| Service catalog | 205 services preserved. | service_items, dry-tech-catalog. | Dry Tech data pack + curated Laundry defaults. | data import. | export first, curate later. | catalog counts and categories. | reproducible Dry Tech catalog path. | P1 |
| Legacy bootstrap | still exists. | migrations/functions. | obsolete/replaced by generator. | generator maturity. | disable/contain after safe replacement. | no hidden mutation. | no generator side effects. | P0 |
