# Business Rule Registry

**Status:** Documentation only — extract intent, not code.

| Rule ID | Description | Trigger | Inputs | Outputs | Severity | Configurability | Industry Dependency | Future Owner | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| BR-001 | An organization must isolate its data from all other organizations. | Any data access. | organization/tenant id, actor. | scoped records only. | Critical | Core policy | None | Core Platform | RLS policies, `can_access_tenant` usage |
| BR-002 | Platform access is blocked until initialization is complete. | User opens tenant app. | tenant id, onboarding/core setup status. | allow or redirect. | Critical | Configurable gate message only | None | Core Platform | `routes/$tenant.tsx`, `can_enter_platform` |
| BR-003 | Owner must always retain authority over the organization. | Organization creation/setup. | owner user id. | owner role/employee record. | Critical | No | None | Core Platform | `self_service_create_tenant`, `user_roles` |
| BR-004 | Customer order must link to a valid customer. | Order creation/update. | customer id, order fields. | valid order. | Critical | No | None | Order Pack | `orders`, validation diagnostics |
| BR-005 | Order item must link to a valid order. | Add item. | order id, service/product. | order item. | Critical | No | None | Order Pack | `order_items` |
| BR-006 | Service unit must link to a valid order when used. | Generate unit. | order id, item id. | unit/label. | High | Template-specific fields | Laundry now, generic item tracking later | Workflow/Document Pack | `service_units`, station components |
| BR-007 | Payment recording must not corrupt historical journals. | Payment update. | order/work order, amount, method. | payment status, financial transaction/journal. | Critical | Payment methods configurable | None | Accounting Pack | `lib/rules/payment.ts`, `sync_order_financials` |
| BR-008 | Cash closing must use recorded cash/accounting data. | Daily close. | cash account, transactions. | closing record/report. | High | Branch/account rules configurable | None | Accounting Pack | `cash-closing.tsx`, cash tables |
| BR-009 | Workflow stage movement should follow configured transitions. | Actor completes stage/task. | current stage, target stage, actor. | status change/task. | High | Yes | None | Workflow Pack | `lib/station-workflow.ts`, workflow stages |
| BR-010 | Quality issues may create rework/exception flows. | QC failure. | order/unit/work order, issue reason. | issue/rework task. | High | Yes | Staged work industries | Quality/Workflow Pack | QC route, customer_returns, qc_checks |
| BR-011 | Delivery work requires actor assignment and status tracking. | Delivery/pickup scheduled. | driver, address, order/request. | route task/status. | High | Yes | Field service businesses | Field Service Pack | driver routes, pickup_requests |
| BR-012 | Notifications must be tied to business events and recipient preferences. | Domain event occurs. | event, recipient, template. | queued/sent notification. | Medium | Yes | None | Notification Pack | notification center, WhatsApp helper |
| BR-013 | Service prices must not be negative. | Service create/edit/order pricing. | price. | valid price or rejection. | High | Yes | None | Catalog/Pricing Pack | services route, Business Initialization docs |
| BR-014 | Branch names should be unique within an organization. | Branch create/edit. | branch name. | branch record. | Medium | Yes | None | Branch Engine | branch docs/setup design |
| BR-015 | Actor route access must respect role/permissions. | Navigation/render/route guard. | actor, role, route. | visible/blocked. | Critical | Yes | None | Permission Engine | AppSidebar, tenant layout, user_roles |
| BR-016 | Generated navigation must come from configuration, not hardcoded industry logic. | Platform generation/navigation load. | capability/template nav assets. | nav items. | High | Yes | None | Core Platform | AppSidebar/core_navigation_items gap |
| BR-017 | A demo/gold organization must not be used as development environment. | Development/QA usage. | organization classification. | allow/deny practice. | Critical | Governance | None | Platform Governance | Dry Tech docs |
| BR-018 | Legacy bootstrap must not mutate generated organizations unexpectedly. | Tenant insert/update. | tenant metadata. | no hidden mutation. | Critical | No | None | Core Platform | Dry run service count risk |
| BR-019 | Business settings should be owner-friendly and not expose technical config. | Business initialization/settings. | owner answers. | configuration. | Medium | Yes | None | Business DNA | UX Blueprint |
| BR-020 | Historical data may be preserved even if internal IDs change. | Migration/restoration. | records/relationships. | integrity preserved. | Critical | Governance | None | Platform Governance | Restoration plan |
