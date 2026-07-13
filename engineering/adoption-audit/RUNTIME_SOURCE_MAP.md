# Runtime Source Map

| Runtime Area | Current Source | Platform Source Exists? | Adoption Status | Target Source |
|---|---|---|---|---|
| Sidebar | Generated nav + static fallback | Yes | Mixed | Generated Navigation Assets only |
| Navigation visibility | Permissions + role fallback | Yes | Mixed | Permission Engine |
| Route protection | Tenant layout partial checks + legacy role checks | Yes | Partial | `actor_has_permission` / `assert_actor_permission` |
| Orders | Order routes/tables | Work Order bridge exists | Mixed | Orders + Work Order + Task bridge |
| Station queues | Station routes + service_units | Work Areas/Tasks exist | Mixed/Legacy | Generic Work Area Queue |
| Workflows | workflow_stages + workflow_stages_v2 + Work Area bridge | Yes | Mixed | Workflow Assets + Work Areas |
| Tasks | legacy task_assignments + core_tasks | Yes | Mixed | core_tasks |
| Reports | routes/components | Report definitions exist | Mixed | Report Engine |
| Dashboards | routes/components | Dashboard definitions exist | Mixed | Dashboard Engine |
| Documents | print components | Document template engine exists | Mixed | Document Template Engine |
| Forms | route forms/components | Dynamic Form Engine exists | Partial | Dynamic Form Engine |
| Automation | DB triggers/helpers | Event/Automation Engine exists | Partial | Domain Events + Automation Rules |
| Notifications | helpers/components | Notification assets pending | Mixed | Event-driven Notification Pack |
| Accounting | accounting routes + journals | Financial events exist | Mixed | Accounting Pack / Financial Transaction model |
| Customer portal | public routes | CRM/Notification/Documents exist | Mixed | Customer Experience Pack |
| Integrations | edge functions/helpers | Integration registry exists | Partial | Integration/Public API foundation |
