# Business DNA Registry

**Status:** Documentation only

Everything configurable becomes Business DNA.

| DNA Variable | Meaning | Example Values | Drives | Evidence |
|---|---|---|---|---|
| Country | Legal/local operating context. | EG, SA, AE | currency, tax, language, phone format | Business Initialization docs, signup/onboarding |
| Currency | Money unit. | EGP, SAR, AED | pricing, receipts, reports | `app_settings`, `use-currency.tsx` |
| Languages | Owner/customer UI and messages. | ar, en, 9-language packs | i18n, notifications, documents | `lib/i18n.tsx`, `lib/i18n-internal.ts` |
| Tax Configuration | Whether/how tax applies. | enabled, rate, tax id | invoices, accounting | onboarding docs, app_settings |
| Branch Count | Operating location complexity. | 1, multi-branch | reports, staff, cash, inventory | branches routes |
| Operating Hours | Work schedule. | days, start, end | scheduling, SLA, availability | onboarding docs |
| Work Stages | Whether work moves through steps. | yes/no, stage list | Workflow Pack | station workflow evidence |
| Field Operations | Whether work happens outside branch. | pickup/delivery/visits | Field Service Pack | driver/live-map/pickups |
| Inventory Usage | Whether stock is tracked. | none/basic/advanced | Inventory Pack | inventory tables/routes |
| Asset Tracking | Whether assets are managed individually. | none/equipment/vehicles/rooms | Asset Pack | equipment_assets |
| Appointments | Whether customers book time. | yes/no | Appointment Pack | schedules/pickups evidence |
| Payment Timing | When money is collected. | before/after/on delivery/milestone | Accounting Pack | payment fields, docs |
| Payment Methods | How customers pay. | cash, instapay, COD | finance, customer portal | payment helpers/RPCs |
| Approval Sensitivity | Required approval controls. | low/medium/high | Approval Pack | approvals docs/chains |
| Quality Control | Whether work needs inspection. | yes/no/stage-specific | Quality Pack | QC route/checks |
| Documentation Need | Required forms/receipts/contracts. | low/medium/high | Document Pack | print invoice/forms |
| Notification Preferences | How people are alerted. | WhatsApp/email/in-app | Notification Pack | notification center/WhatsApp |
| Service Model | Services/products/both. | service, product, mixed | Catalog/order model | service_items, order_items |
| Pricing Model | Fixed/quantity/time/custom. | fixed, qty, hourly | pricing rules | services/order routes |
| Team Structure | Roles and responsibilities. | owner, ops, CS, courier | permissions, nav, tasks | user_roles/staff routes |
| Dashboard Needs | Owner KPIs and first actions. | operations, finance, customer | reporting/dashboard packs | dashboard routes |
| Template Choice | Starting configuration. | Laundry Template, etc. | generated assets | template registry |
| Capability Packs | Operating capabilities enabled. | workflow, CRM, accounting | generator output | capability docs |
