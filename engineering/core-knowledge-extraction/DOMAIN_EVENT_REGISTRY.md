# Domain Event Registry

**Status:** Documentation only

| Event | Producer | Consumers | Business Meaning | Future Pack Dependencies | Evidence |
|---|---|---|---|---|---|
| Organization Created | Signup / generator | onboarding, billing, audit, notifications | A business shell exists. | Core Platform, Business Initialization | `self_service_create_tenant`, `routes/signup.tsx` |
| Organization Initialized | Platform Generator | navigation, permissions, dashboard | Business is ready to enter platform. | Core Platform, Template Registry | `tenant_onboarding`, `core_setup_profiles` |
| Customer Created | CRM/customer portal/staff | CRM, notifications, reports | New recipient of value exists. | CRM Pack | customers routes, `customers` |
| Customer Updated | CRM/staff | audit, reports | Customer information changed. | CRM Pack | customers route |
| Order Created | Order intake/customer portal | workflow, accounting, notifications, reports | Customer made commercial request. | Order Pack, Workflow Pack | `orders/new.tsx`, customer portal |
| Order Updated | Order detail/station flow | audit, reports, notifications | Commercial request changed. | Order Pack | `orders/$id.tsx` |
| Order Cancelled | Order management | finance, inventory, notifications | Customer request stopped. | Order/Accounting Pack | cancellation migrations/routes |
| Work Order Created | Generator/workflow/order bridge | tasks, actors, reports | Internal execution is required. | Workflow Pack | `work_orders` foundation |
| Work Order Started | Actor/task system | reports, notifications | Execution has begun. | Workflow Pack | work order migrations |
| Task Assigned | Workflow/task engine | actor, notifications | Someone must act. | Task Engine, Notification Pack | `task_assignments`, next-task card |
| Task Completed | Actor | workflow, reports, notifications | Action finished. | Workflow Pack | station/task components |
| Stage Completed | Workflow/station | next stage, notifications | Work progressed. | Workflow Pack | `workflow_stages`, service units |
| Quality Issue Raised | QC | workflow, customer care, reports | Work requires attention/rework. | Quality Pack | QC route, `qc_checks`, `customer_returns` |
| Pickup Requested | Customer/CS | dispatch, notifications | Field pickup demand exists. | Field Service Pack | pickup routes, `pickup_requests` |
| Driver Assigned | Dispatch | courier, customer notifications | Field actor responsible. | Field Service Pack | driver assignment helper |
| Delivery Completed | Courier | accounting, notifications, reports | Customer received output. | Field Service Pack, Accounting Pack | driver route, orders delivered fields |
| Invoice Printed | Order/document component | customer, accounting, audit | Customer-facing financial document issued. | Document Pack, Accounting Pack | `print-invoice.tsx` |
| Payment Recorded | Order/customer portal/accounting | finance, ledger, reports | Money collected or promised. | Accounting Pack | payment helper, journals |
| Journal Posted | Accounting sync | reports, audit | Accounting impact recorded. | Accounting Pack | `journal_entries` |
| Employee Checked In | Attendance | scheduling, payroll, reports | Actor availability started. | HR Pack | attendance route/widget |
| Notification Queued | Notification engine | delivery provider | Message should be delivered. | Notification Pack | `app_notifications`, `customer_messages` |
| Notification Sent | Notification provider | audit, reports | Message left the system. | Notification Pack | WhatsApp function/helper |
| Report Generated | Reporting engine | owner/manager | Business question answered. | Reporting Pack | reports routes |
| Service Price Changed | Catalog manager | orders, reports | Commercial catalog changed. | Catalog/Pricing Pack | services route |
| Branch Updated | Owner/manager | reports, routing, staff | Location/operation changed. | Branch Engine | branch routes |
| Approval Requested | Actor/system | approver, notifications | Controlled decision needed. | Approval Pack | approval chains/core setup approvals |
| Approval Granted | Approver | workflow, finance, audit | Action may proceed. | Approval Pack | approval model |
