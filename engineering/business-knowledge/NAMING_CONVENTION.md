# MJRH Naming Convention

**Status:** Architecture draft — pending review  
**Purpose:** Ensure database, APIs, TypeScript, services, components, and UI labels follow the same business terminology.

---

## 1. Naming Principles

1. Business language comes first.
2. One concept has one official name.
3. Technical names must not leak into customer-facing UI.
4. Names should map to the Business Glossary.
5. Avoid synonyms that create duplicate meanings.
6. Avoid industry-specific Core names.

---

## 2. Customer-Facing UI Labels

### Use business language

| Concept | UI label examples |
|---|---|
| Organization | Business, Company, Organization |
| Branch | Location, Branch |
| Department | Work Area, Department |
| Actor | Team member, Person, User |
| Role | Responsibility, Access level |
| Workflow | Work steps, Work flow |
| Work Order | Work item, Internal work order |
| Task | Task, Next action |
| Financial Transaction | Payment, money movement, transaction |

### Avoid in customer UI

- tenant
- schema
- engine
- RPC
- migration
- RLS
- database
- config JSON
- template asset
- workflow blueprint

---

## 3. Database Naming

Database names should be stable, plural, snake_case, and based on the Business Knowledge Model.

### Table naming

Use:

```txt
organizations / tenants only where legacy requires it
branches
 departments
actors
roles
customers
suppliers
services
products
assets
inventory_items
orders
work_orders
tasks
workflows
approvals
documents
financial_transactions
reports
notifications
```

Current legacy tables may remain for compatibility, but new tables should follow the business model.

### Column naming

Use:

- `organization_id` where new code is not constrained by legacy
- `tenant_id` only for existing multi-tenant infrastructure compatibility
- `branch_id`
- `department_id`
- `actor_id`
- `role_id`
- `customer_id`
- `supplier_id`
- `order_id`
- `work_order_id`
- `task_id`

### Boolean naming

Use:

- `is_active`
- `is_required`
- `is_completed`
- `requires_approval`
- `can_be_changed_later`

Avoid vague names:

- `flag`
- `enabled2`
- `status_bool`

### Status naming

Use lifecycle-based values:

```txt
draft
active
in_progress
blocked
completed
closed
cancelled
archived
```

Do not create industry-specific status names in Core.

---

## 4. API Naming

API/action names should describe business actions.

Use:

```txt
createOrganization
initializeBusiness
applyTemplate
createWorkOrder
assignTask
approveAction
recordFinancialTransaction
sendNotification
generateReport
```

Avoid:

```txt
insertTenantConfig
runSetupRPC
createLaundryOrder
seedDemoStuff
processDbRow
```

---

## 5. TypeScript Naming

Types/interfaces should use PascalCase and business terms.

Use:

```ts
Organization
Branch
Department
Actor
Role
Customer
Supplier
Service
Product
Asset
Order
WorkOrder
Task
Workflow
Approval
Document
FinancialTransaction
Report
Notification
BusinessDnaProfile
CapabilityPack
IndustryTemplate
```

Avoid technical or industry-specific Core types:

```ts
LaundryThing
TenantSetupJson
WorkflowBlueprintRowForHotel
DbConfigBlob
```

---

## 6. Service/Module Naming

Application services should be named after business capabilities.

Use:

```txt
organization-service
template-service
capability-pack-service
workflow-service
work-order-service
task-service
finance-service
document-service
notification-service
reporting-service
```

Avoid:

```txt
laundry-service
hotel-service
misc-service
utils2
new-engine
```

Industry-specific logic belongs in templates/packs, not custom services.

---

## 7. Component Naming

Components should be named by user/business purpose.

Use:

```txt
BusinessInitializationWizard
RecommendedStartingPlan
WorkStepsPreview
FirstSuccessDashboard
CustomerList
WorkOrderBoard
TaskCard
ApprovalPanel
FinancialSummary
```

Avoid:

```txt
TenantJsonEditor
LaundryWizard
WorkflowEngineV3Screen
AdminDebugPanelInCustomerSetup
```

---

## 8. Template and Pack Naming

### Capability Packs

Format:

```txt
<Capability> Pack
```

Examples:

- Workflow Management Pack
- Inventory Management Pack
- Accounting Pack
- CRM Pack

### Industry Templates

Format:

```txt
<Industry> Template
```

Examples:

- Laundry Template
- Hotel Template
- Clinic Template

### Demo/Reference Organizations

Format:

```txt
<Name> Demo Organization
<Name> Gold Standard Organization
```

Example:

```txt
Dry Tech Gold Standard Organization
```

---

## 9. Migration Naming

Migration names should describe architectural/business intent.

Use:

```txt
YYYYMMDDHHMMSS_business_knowledge_model_foundation.sql
YYYYMMDDHHMMSS_capability_pack_registry.sql
YYYYMMDDHHMMSS_business_initialization_defaults.sql
```

Avoid vague names:

```txt
fix_stuff.sql
new_changes.sql
laundry_patch_again.sql
```

---

## 10. Final Rule

If a name does not map to the Business Glossary, do not introduce it until the glossary is updated.
