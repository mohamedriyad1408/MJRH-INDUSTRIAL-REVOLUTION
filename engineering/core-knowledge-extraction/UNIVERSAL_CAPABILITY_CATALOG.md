# Universal Capability Catalog

**Status:** Documentation only

| Capability | Why Universal | Why Not Industry-Specific | Future Dependencies | Required APIs | Required Configuration | Evidence |
|---|---|---|---|---|---|---|
| Authentication | Every organization needs identity. | Login is not industry-specific. | Roles, permissions, organizations. | sign up, sign in, verify phone, reset password. | auth providers, verification policy. | `hooks/use-auth.tsx`, `routes/login.tsx`, `routes/signup.tsx` |
| Organizations | Every customer operates an organization. | Organization boundary exists for all. | Branches, config, billing. | create, initialize, suspend, archive. | country, language, owner, template. | `tenants`, `self_service_create_tenant` |
| Branches | Most businesses have locations or operating hubs. | Location is generic. | Inventory, staff, cash, reports. | create branch, assign actor, branch reports. | branch type, address, active status. | `routes/$tenant/branches.tsx` |
| Customers / CRM | Most businesses serve customers. | Customer history is universal. | Orders, messaging, payments. | create customer, search, segment, contact. | customer fields, preferences. | `customers.tsx`, `crm.tsx` |
| Services / Products | Businesses sell work or things. | The distinction is universal. | Orders, pricing, inventory. | create catalog item, price, categorize. | service/product attributes, tax. | `services.tsx`, `lib/dry-tech-catalog.ts` |
| Orders | Commercial requests exist across many industries. | What is ordered varies by template. | Customers, catalog, finance. | create order, update, cancel, invoice. | order types, statuses, pricing. | order routes |
| Work Orders | Internal execution exists across many industries. | Work content varies; container is universal. | Workflow, tasks, actors. | create work order, assign, complete. | workflow, SLA, required fields. | `work_orders`, workflow v3 migrations |
| Tasks | Work must be assigned and completed. | Task is universal execution atom. | Actors, workflow, approvals. | assign task, start, complete. | task types, proof requirements. | `task_assignments`, `next-task-card.tsx` |
| Scheduling/Appointments | Many businesses coordinate time. | Time booking is generic. | Notifications, actors, resources. | book, reschedule, cancel. | availability, calendar rules. | staff schedules, pickup scheduling evidence |
| Documents | Businesses need proof and records. | Document types vary, engine is universal. | Orders, finance, approvals. | generate, print, sign, archive. | templates, numbering, fields. | `print-invoice.tsx`, `core_documents` |
| Reports | Owners need answers. | Questions vary; reporting is universal. | Entity relationships, metrics. | generate, filter, export. | definitions, widgets, KPIs. | reports routes |
| Accounting | Every commercial business tracks money. | Accounts vary; finance model is generic. | Orders, transactions, documents. | record transaction, journal, close cash. | chart, taxes, payment methods. | accounting routes, journals |
| Inventory | Many businesses track stock. | Stock concepts are generic. | Products, suppliers, branches. | stock in/out, transfer, count. | units, reorder levels. | inventory tables/routes |
| Notifications | People need alerts and messages. | Channels and wording vary. | Events, actors, customers. | queue, send, retry. | templates, channels, preferences. | notification center, WhatsApp helper |
| Approvals | Risky actions need control. | Approval is universal. | Roles, tasks, finance. | request, approve, reject. | thresholds, approvers. | approval chains, setup approvals |
| Field Service | Many businesses work outside branch. | Field behavior is generic. | Location, tasks, dispatch. | assign route, update location, complete visit. | zones, proof, maps. | driver/live-map/pickup routes |
| AI / Advisor | Platform should guide owners. | Advice uses business model, not industry hardcode. | Reports, events, KPIs. | recommend, warn, summarize. | rules, thresholds, tone. | `lib/ai-advisor.ts`, advisor widget |
| Automation | Repetitive business events need rules. | Trigger/action model is universal. | Events, workflows, notifications. | define trigger, run action, audit. | rule definitions. | triggers/functions evidence |
| Dashboards | First business view must guide action. | Widget composition varies. | Reports, KPIs, roles. | load dashboard, configure widgets. | dashboard definitions. | dashboard/today/executive routes |
| Forms / Checklists | Work needs structured inputs. | Fields vary by template. | Workflows, documents. | define form, submit, validate. | schema, required fields. | core forms, input builder |
| Messaging | Customers/team need communication. | Message triggers vary. | Notifications, CRM. | compose, send, template. | language, channel, template. | WhatsApp/customer messages |
| Permissions | Access must be controlled. | Permissions are universal. | Actors, roles, navigation. | canAccess, grant, revoke. | role rules. | `user_roles`, `core_roles` |
| Business DNA | Initialization must understand business traits. | Traits apply across industries. | Packs/templates. | capture DNA, compute packs. | DNA dimensions. | business DNA docs/onboarding |
