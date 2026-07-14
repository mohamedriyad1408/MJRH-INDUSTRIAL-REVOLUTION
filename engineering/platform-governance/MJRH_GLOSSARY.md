# MJRH Glossary

**Status:** Canonical Platform Language  
**Rule:** Every term has one meaning. If a concept is not here, do not implement it until defined.

| Term | Definition | Scope | Allowed Usage | Forbidden Synonyms |
|---|---|---|---|---|
| Organization | Business entity operated in MJRH. | Core | Business boundary, generated org, tenant internally. | Project, tenant in UI. |
| Branch | Physical or operational location. | Core | Store, hub, site, branch. | Department, station. |
| Actor | Person/system/team/external party that acts. | Core | Owner, employee, courier, customer, integration. | User only. |
| Role | Responsibility and permission pattern assigned to Actor. | Core | Access level, approval authority. | Job title as Core concept. |
| Permission | Rule deciding what an Actor can see/do. | Core | route/action/data access. | UI visibility only. |
| Capability | Reusable business ability. | Platform | CRM, Field Service, Reporting. | Feature hack. |
| Capability Pack | Composable package for reusable operating capability. | Pack | Workflow Pack, Accounting Pack. | Industry template. |
| Template | Replaceable configuration preset composed from packs. | Template | Laundry Template, Clinic Template. | Core code. |
| Business DNA | Specific characteristics of one business. | Platform | branches, hours, payments, approvals. | Industry name only. |
| Order | Customer-facing commercial request. | Platform/Pack | what customer requested and owes. | Work Order, Task. |
| Work Order | Internal execution container for work. | Core/Pack | operational work to perform. | Order, Task. |
| Task | Specific action assigned to Actor/team. | Core | next action, assignment. | Work Order. |
| Workflow | Configured path work follows. | Core/Pack | stages, transitions, tasks. | Department, station. |
| Document | Formal/operational record. | Pack | receipt, invoice, checklist, contract. | Report, notification. |
| Automation | Configured trigger/action behavior. | Platform/Pack | event-based rule. | hidden DB side effect. |
| Dashboard | Role/business summary and next actions. | Pack/Runtime | owner dashboard, operations dashboard. | raw report only. |
| Event | Business occurrence. | Core/Pack | Order Created, Payment Recorded. | database trigger only. |
| Rule | Business decision constraint. | Pack/Core | validation, approval, pricing. | React conditional. |
| Trigger | Event/condition that starts automation. | Platform | domain event trigger. | database trigger only. |
| Initialization | Owner-guided process creating generated organization. | Platform | Business Initialization. | technical setup wizard. |
| Validation | Evidence that behavior/data/integrity is correct. | Governance | Dry Tech validation, CI validation. | counts only. |
| Blueprint | Configurable design of workflow/report/form before runtime. | Pack/Template | workflow blueprint. | hardcoded component. |
| Generated Organization | Runtime organization produced by Platform Generator. | Runtime | demo/customer/gold org. | architecture source. |
| Legacy | Old implementation preserved for evidence or temporary compatibility. | Governance | reference, extract, rewrite, delete. | future architecture. |
| Evidence | Source proving business knowledge existed. | Governance | file, commit, table, route. | implementation mandate. |
| Technical Debt | Implementation that should not shape future architecture. | Governance | hidden bootstrap, hardcoded station routes. | reusable capability. |
| Business Operating Model | Fundamental way a business operates. | Platform | service, workflow, inventory, field. | industry label. |
| Gold Standard Organization | Stable validation benchmark organization. | Governance | Dry Tech. | development sandbox. |
