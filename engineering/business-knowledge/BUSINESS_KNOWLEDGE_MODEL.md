# MJRH Business Knowledge Model

**Status:** Sprint 0.5 mandatory foundation — pending review  
**Branch:** `feature/mjrh-v3-core-platform`  
**Purpose:** Define the stable business language and entity model that all future industries, templates, modules, features, database objects, APIs, UI labels, and workflows must follow.

---

## 1. Foundation Principle

MJRH is not building software for one industry.

MJRH is building a universal business operating model.

Every new industry should emerge from the Business Knowledge Model through reusable capability packs and configuration — not through industry-specific code.

If a new feature cannot be explained first in the Business Knowledge Model, it must not be implemented yet.

---

## 2. Architectural Rule

```txt
Code follows the Business Model.
Templates follow the Business Model.
Setup follows the Business Model.
UI follows the Business Model.
The Business Model never follows implementation details.
```

---

## 3. Core Business Entities

Each entity below has exactly one meaning in MJRH.

---

## 3.1 Organization

### Business definition

An Organization is the business entity being operated inside MJRH.

It may represent:

- a company
- a business unit
- a franchise location group
- an operating entity
- a demo or reference organization

### Purpose

Provide the top-level boundary for ownership, data, configuration, permissions, reports, and operations.

### Responsibilities

An Organization owns:

- branches
- departments
- actors
- roles
- customers
- suppliers
- services
- products
- assets
- inventory
- workflows
- orders
- work orders
- tasks
- approvals
- documents
- financial transactions
- reports
- notifications
- configuration

### Relationships

```txt
Organization
├── Branches
├── Departments
├── Actors / Roles
├── Customers / Suppliers
├── Services / Products
├── Assets / Inventory
├── Workflows / Work Orders / Tasks
├── Documents / Reports
└── Financial Transactions / Notifications
```

### Lifecycle

```txt
Created → Initialized → Active → Suspended → Archived / Deleted
```

### Ownership

Owned by an Organization Owner or authorized parent entity.

### Hard rule

No Organization data may leak into another Organization.

---

## 3.2 Branch

### Business definition

A Branch is a physical or operational location where work is managed.

### Purpose

Represent where business activity happens or is coordinated.

### Responsibilities

A Branch may manage:

- local team members
- orders and work orders
- cash and payments
- inventory
- assets
- schedules
- delivery coverage
- branch-level reports

### Relationships

```txt
Organization → Branch
Branch → Actors
Branch → Orders / Work Orders
Branch → Inventory / Assets
Branch → Financial Transactions
```

### Lifecycle

```txt
Planned → Active → Temporarily Closed → Inactive → Archived
```

### Ownership

Owned by the Organization.

### Distinction

A Branch is about **location**.

A Department is about **responsibility**.

---

## 3.3 Department

### Business definition

A Department is an area of responsibility inside an Organization.

### Purpose

Group work, people, tasks, permissions, and reports around responsibility.

### Responsibilities

A Department may own:

- work queues
- actors
- tasks
- KPIs
- documents
- approvals
- reports

### Relationships

```txt
Organization → Department
Department → Actors
Department → Workflows / Tasks
Department → Reports
```

### Lifecycle

```txt
Defined → Active → Reorganized → Inactive → Archived
```

### Ownership

Owned by the Organization and configured by templates or authorized managers.

### Hard rule

The Core Platform must not assume default departments.

Departments come from Capability Packs, Industry Templates, or customer configuration.

---

## 3.4 Actor

### Business definition

An Actor is any person, system, team, or external party that performs or influences business activity.

### Purpose

Represent who can do something.

### Examples

- owner
- manager
- supervisor
- employee
- technician
- driver
- customer
- supplier
- automated system
- integration

### Responsibilities

An Actor may:

- perform tasks
- approve actions
- receive notifications
- own records
- create orders
- complete work
- trigger financial events

### Relationships

```txt
Actor → Roles
Actor → Branches
Actor → Departments
Actor → Tasks
Actor → Approvals
Actor → Notifications
```

### Lifecycle

```txt
Invited / Created → Active → Suspended → Inactive → Archived
```

### Ownership

Owned by the Organization or represented as an external participant.

---

## 3.5 Role

### Business definition

A Role is a responsibility and permission pattern assigned to an Actor.

### Purpose

Define what an Actor can see, do, approve, or manage.

### Responsibilities

A Role may define:

- access rights
- approval authority
- task eligibility
- report visibility
- operational responsibility

### Relationships

```txt
Role → Actors
Role → Permissions
Role → Approval Levels
Role → Workflow Responsibilities
```

### Lifecycle

```txt
Defined → Assigned → Modified → Retired
```

### Ownership

Owned by the Organization configuration and generated from Capability Packs/Templates.

### Hard rule

The Core understands permissions and relationships.

Job titles belong to templates and customer configuration.

---

## 3.6 Customer

### Business definition

A Customer is the person or organization receiving value from the business.

### Purpose

Represent who buys, requests, receives, or benefits from services/products.

### Responsibilities

A Customer may:

- place orders
- request work
- own assets
- book appointments
- receive documents
- receive notifications
- make payments

### Relationships

```txt
Customer → Orders
Customer → Work Orders
Customer → Assets
Customer → Documents
Customer → Financial Transactions
Customer → Notifications
```

### Lifecycle

```txt
Lead → Active Customer → Repeat Customer → Inactive → Archived
```

### Ownership

Owned by the Organization.

---

## 3.7 Supplier

### Business definition

A Supplier is an external party providing goods, services, labor, equipment, or materials to the Organization.

### Purpose

Track procurement, costs, supply relationships, payables, and dependencies.

### Responsibilities

A Supplier may provide:

- inventory items
- products
- maintenance services
- outsourced labor
- equipment
- professional services

### Relationships

```txt
Supplier → Products / Inventory
Supplier → Purchase Records
Supplier → Financial Transactions
Supplier → Documents
Supplier → Work Orders
```

### Lifecycle

```txt
Prospect → Approved → Active → Suspended → Archived
```

### Ownership

Owned by the Organization.

---

## 3.8 Service

### Business definition

A Service is work the business performs for a Customer or internal need.

### Purpose

Represent what the business does.

### Responsibilities

A Service may define:

- price
- category
- required workflow
- required inputs
- estimated duration
- responsible department
- documents
- tax behavior

### Relationships

```txt
Service → Orders
Service → Work Orders
Service → Workflow
Service → Price / Financial Transactions
Service → Documents
```

### Lifecycle

```txt
Draft → Active → Modified → Inactive → Archived
```

### Ownership

Owned by the Organization and usually generated from Capability Packs/Templates.

---

## 3.9 Product

### Business definition

A Product is a tangible or digital item the business sells, makes, stocks, consumes, rents, or delivers.

### Purpose

Represent things rather than work.

### Responsibilities

A Product may define:

- SKU
- price
- cost
- inventory behavior
- supplier
- manufacturing process
- sales channel
- tax behavior

### Relationships

```txt
Product → Inventory Items
Product → Orders
Product → Suppliers
Product → Manufacturing Work Orders
Product → Financial Transactions
```

### Lifecycle

```txt
Draft → Active → Discontinued → Archived
```

### Ownership

Owned by the Organization.

### Distinction

A Service is work performed.

A Product is a thing sold, made, stocked, or delivered.

---

## 3.10 Asset

### Business definition

An Asset is an individually tracked object with operational value or history.

### Purpose

Track important things over time.

### Examples

- machine
- vehicle
- room
- medical device
- equipment
- customer-owned item
- property
- production line

### Responsibilities

An Asset may have:

- owner
- location
- condition
- assignment
- maintenance history
- documents
- lifecycle state
- financial value

### Relationships

```txt
Asset → Work Orders
Asset → Tasks
Asset → Documents
Asset → Financial Transactions
Asset → Customer / Branch / Organization
```

### Lifecycle

```txt
Registered → Active → Assigned → Under Maintenance → Retired → Archived
```

### Ownership

May be owned by the Organization or a Customer.

---

## 3.11 Order

### Business definition

An Order is a customer-facing commercial request.

### Purpose

Represent what the Customer requested and what they owe.

### Responsibilities

An Order may contain:

- customer
- services/products
- quantities
- prices
- discounts
- tax
- payment status
- delivery/pickup information
- documents
- related work orders

### Relationships

```txt
Customer → Order
Order → Services / Products
Order → Work Orders
Order → Documents
Order → Financial Transactions
```

### Lifecycle

```txt
Draft → Confirmed → In Progress → Ready / Completed → Delivered / Closed → Cancelled
```

### Ownership

Owned by the Organization and linked to a Customer.

### Distinction

An Order is commercial/customer-facing.

A Work Order is internal/execution-facing.

---

## 3.12 Work Order

### Business definition

A Work Order is an internal execution record for work that must be performed.

### Purpose

Represent what the business must do operationally.

### Responsibilities

A Work Order may define:

- workflow
- assigned actors
- tasks
- due date
- required inputs
- status
- quality checks
- documents
- output

### Relationships

```txt
Work Order → Workflow
Work Order → Tasks
Work Order → Actors
Work Order → Documents
Work Order → Assets
Work Order → Order (optional)
```

### Lifecycle

```txt
Created → Assigned → In Progress → Waiting / Blocked → Completed → Closed / Cancelled
```

### Ownership

Owned by the Organization and may be connected to an Order, Asset, Customer, or internal need.

### Distinction

One Order may create many Work Orders.

Some Work Orders exist without Orders.

---

## 3.13 Task

### Business definition

A Task is a specific action assigned to an Actor or team.

### Purpose

Define the next actionable piece of work.

### Responsibilities

A Task may have:

- assignee
- instructions
- due date
- status
- required input
- completion proof
- related workflow step

### Relationships

```txt
Task → Actor
Task → Work Order
Task → Workflow Step
Task → Approval
Task → Document
```

### Lifecycle

```txt
Created → Assigned → Started → Completed / Rejected / Cancelled
```

### Ownership

Owned by the Organization and assigned to Actors.

---

## 3.14 Workflow

### Business definition

A Workflow is the path work follows from start to finish.

### Purpose

Define how work moves.

### Responsibilities

A Workflow may define:

- stages
- transitions
- tasks
- required fields
- approval points
- responsible roles
- SLA rules
- documents
- notifications
- financial events

### Relationships

```txt
Workflow → Work Orders
Workflow → Tasks
Workflow → Departments
Workflow → Roles
Workflow → Documents
Workflow → Approvals
```

### Lifecycle

```txt
Draft → Active → Revised → Deprecated → Archived
```

### Ownership

Owned by the Organization configuration and usually generated from Capability Packs/Templates.

### Hard rule

The Workflow Engine executes workflows.

It does not define industries.

---

## 3.15 Approval

### Business definition

An Approval is a controlled decision required before an action can proceed.

### Purpose

Protect money, risk, compliance, quality, or operational integrity.

### Responsibilities

An Approval may define:

- requester
- approver
- reason
- threshold
- status
- decision
- audit record

### Relationships

```txt
Approval → Actor
Approval → Task
Approval → Order / Work Order
Approval → Financial Transaction
Approval → Document
```

### Lifecycle

```txt
Requested → Pending → Approved / Rejected → Recorded
```

### Ownership

Owned by the Organization and governed by permission rules.

---

## 3.16 Document

### Business definition

A Document is a formal or operational record required or produced by the business.

### Purpose

Create proof, communication, compliance, and traceability.

### Examples

- receipt
- invoice
- delivery note
- intake form
- inspection checklist
- contract
- approval record
- medical form
- maintenance report

### Responsibilities

A Document may contain:

- number
- owner
- source record
- fields
- status
- signature
- audit history

### Relationships

```txt
Document → Customer
Document → Order
Document → Work Order
Document → Asset
Document → Financial Transaction
Document → Approval
```

### Lifecycle

```txt
Draft → Issued → Sent / Signed → Revised / Cancelled → Archived
```

### Ownership

Owned by the Organization.

---

## 3.17 Financial Transaction

### Business definition

A Financial Transaction is a money-related business event.

### Purpose

Record what happened financially.

### Generic examples

- transaction
- adjustment
- allocation
- settlement
- approval
- transfer

### Responsibilities

A Financial Transaction may record:

- amount
- currency
- account
- source record
- actor
- payment method
- status
- journal impact

### Relationships

```txt
Financial Transaction → Order
Financial Transaction → Work Order
Financial Transaction → Customer / Supplier
Financial Transaction → Document
Financial Transaction → Approval
Financial Transaction → Account
```

### Lifecycle

```txt
Draft → Pending → Posted → Settled → Reversed / Cancelled
```

### Ownership

Owned by the Organization.

### Hard rule

Core financial terms must remain industry-neutral.

---

## 3.18 Report

### Business definition

A Report is a structured answer to a business question.

### Purpose

Help the owner and team understand performance, risk, money, operations, and next actions.

### Responsibilities

A Report may show:

- operational status
- delays
- revenue
- cash
- customers
- quality
- staff
- inventory
- compliance

### Relationships

```txt
Report → Organization
Report → Branch
Report → Department
Report → Orders / Work Orders / Tasks
Report → Financial Transactions
```

### Lifecycle

```txt
Defined → Generated → Reviewed → Exported / Archived
```

### Ownership

Owned by the Organization or platform template.

---

## 3.19 Notification

### Business definition

A Notification is a message or alert sent to an Actor, Customer, Supplier, or system.

### Purpose

Ensure people know what happened or what they must do next.

### Responsibilities

A Notification may include:

- recipient
- channel
- message
- trigger
- status
- delivery result
- source record

### Relationships

```txt
Notification → Actor / Customer / Supplier
Notification → Order / Work Order / Task
Notification → Approval
Notification → Document
```

### Lifecycle

```txt
Created → Queued → Sent → Delivered / Failed → Read / Archived
```

### Ownership

Owned by the Organization or system automation.

---

## 4. Relationship Summary

```txt
Organization
├── Branches
│   ├── Actors
│   ├── Inventory
│   ├── Assets
│   ├── Orders
│   └── Financial Transactions
├── Departments
│   ├── Actors
│   ├── Workflows
│   ├── Tasks
│   └── Reports
├── Customers
│   ├── Orders
│   ├── Assets
│   ├── Documents
│   └── Financial Transactions
├── Suppliers
│   ├── Products
│   ├── Inventory
│   ├── Documents
│   └── Financial Transactions
├── Services / Products
│   └── Orders
├── Orders
│   ├── Work Orders
│   ├── Documents
│   └── Financial Transactions
├── Work Orders
│   ├── Workflow
│   ├── Tasks
│   ├── Assets
│   ├── Documents
│   └── Approvals
└── Reports / Notifications
```

---

## 5. Identity and Integrity Rule

During generation, migration, or restoration, the absolute rule is not:

```txt
Preserve every database ID.
```

The absolute rule is:

```txt
Preserve relationships and data integrity.
```

IDs may be preserved when useful.

IDs may change if there is a valid architectural reason.

But relationships, auditability, historical meaning, and operational continuity must never break.

---

## 6. Final Rule

If a future feature cannot be described using these business entities and relationships, the team must update or clarify the Business Knowledge Model before implementation.

---

# Core Knowledge Extraction Extension

**Status:** Added during MJRH Core Knowledge Extraction Sprint  
**Rule:** Never ask “Can this code be reused?” Ask “What business knowledge does this code preserve?”

This extension converts historical MJRH runtime behavior into a stable knowledge map. Runtime implementation is evidence only, not architecture.

## Capability Knowledge Map

| Capability | Business Goal | Actors | Business Rules | Inputs | Outputs | Dependencies | Domain Events | Lifecycle | Universal vs Industry Specific | Core Layer | Platform Layer | Template Layer | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Organization Management | Create and operate a business boundary. | Owner, admin, team members. | One organization owns its data/configuration; no cross-organization leakage. | owner identity, organization name, slug, country. | active organization, access boundary, setup profile. | Auth, permissions, setup profile. | Organization Created, Organization Initialized, Organization Suspended. | Created → Initialized → Active → Suspended/Archived. | Universal. | Organization Engine, Auth, Permissions. | Business Initialization, Platform Generator. | Industry templates configure defaults only. | `routes/signup.tsx`, `routes/$tenant.tsx`, `supabase/migrations/20260715000004_fix_self_service_owner_employee_upsert.sql` |
| Branch Management | Represent operating locations. | Owner, managers, employees. | Work, inventory, cash, reports may be branch-scoped. | branch name, address/area, active state. | branch records, branch filters, branch reports. | Organization, actors, orders, finance. | Branch Created, Branch Updated. | Planned → Active → Inactive. | Universal. | Branch Engine. | Branch dashboards/reporting. | Templates may propose branches. | `routes/$tenant/branches.tsx`, `routes/$tenant/branches/$id.tsx`, `components/branch-filter.tsx` |
| Actor & Permission Management | Control who can do what. | Owner, managers, employees, couriers, customers. | Permissions must come from roles/capability config, not hardcoded industry roles. | actor identity, roles, approval level. | access decisions, assignments. | Auth, organization, departments. | Role Assigned, Permission Changed. | Invited → Active → Suspended → Archived. | Universal. | Permission Engine, Actor Engine. | Role mapping, generated navigation. | Templates define role presets. | `hooks/use-auth.tsx`, `components/app-sidebar.tsx`, `routes/$tenant/staff/users.tsx`, `core_roles` |
| Customer Management / CRM | Manage people/organizations receiving value. | Customer, CS, owner. | Customer history must link to orders/work/orders/messages/payments. | name, phone, address, preferences. | customer profiles, segments, history. | Orders, notifications, finance. | Customer Created, Customer Updated, Customer Contacted. | Lead → Active → Repeat → Inactive. | Universal. | Customer entity, search. | CRM Pack, Customer Experience Pack. | Templates define customer fields/preferences. | `routes/$tenant/customers.tsx`, `routes/$tenant/crm.tsx`, `routes/customer-portal.tsx`, `components/unified-search.tsx` |
| Service / Product Catalog | Define what the business sells or performs. | Owner, CS, sales, operations. | Catalog items must be configurable and not hardcoded in Core. | service/product name, price, category, type. | orderable items, price lines, reports. | Orders, finance, documents. | Service Created, Price Changed. | Draft → Active → Inactive. | Universal with template-specific defaults. | Catalog primitives. | Catalog Pack / Pricing Pack. | Laundry Template service defaults; Dry Tech full data pack. | `routes/$tenant/services.tsx`, `lib/dry-tech-catalog.ts`, `service_items` |
| Order Management | Capture customer-facing commercial requests. | Customer, CS, owner. | Order records commercial promise; execution may be work orders/tasks. | customer, services/products, price, delivery/pickup data. | order, invoice/receipt, payment status. | Customers, catalog, finance, documents. | Order Created, Order Updated, Order Cancelled. | Draft → Confirmed → In Progress → Closed/Cancelled. | Universal. | Order entity. | Order Pack, CRM, Accounting, Document Pack. | Templates define statuses/labels. | `routes/$tenant/orders/index.tsx`, `routes/$tenant/orders/new.tsx`, `routes/$tenant/orders/$id.tsx` |
| Work Order / Task Execution | Execute internal work independent of industry. | Actors, supervisors, managers. | Execution must be stage/task based and not hardcoded to Laundry stations. | work order, workflow, assigned actor, due time. | tasks, progress, completion proof. | Workflow, actors, departments. | Work Order Created, Task Assigned, Task Completed. | Created → Assigned → In Progress → Completed/Closed. | Universal. | Work Order Engine, Task Engine. | Workflow Management Pack. | Templates define stage labels and defaults. | `work_orders`, `task_assignments`, `lib/workflow-engine-v2.ts`, `routes/$tenant/stations/$stage.tsx` |
| Workflow Management | Define how work moves. | Owner, ops manager, actor. | Workflow engine executes configured workflows; it does not define industries. | stages, transitions, SLA, required fields. | executable workflow, tasks, alerts. | Work orders, documents, notifications. | Stage Entered, Stage Completed, Workflow Completed. | Draft → Active → Revised → Archived. | Universal. | Workflow Engine. | Workflow Pack. | Laundry stages as template assets. | `lib/station-workflow.ts`, `lib/workflow-engine-v2.ts`, `core_workflow_blueprints`, `workflow_stages` |
| Field Service | Manage work outside branch. | Courier, dispatcher, customer. | Field work needs assignment, route, location, status and proof. | address, coordinates, actor, route. | route tasks, pickup/delivery status. | Customers, orders/work orders, notifications. | Pickup Requested, Driver Assigned, Delivery Completed. | Requested → Assigned → In Field → Completed. | Universal capability. | Location/task primitives. | Field Service Pack. | Laundry pickup/delivery labels. | `routes/$tenant/driver.tsx`, `routes/$tenant/live-map.tsx`, `components/driver-components.tsx`, `lib/route-optimizer.ts` |
| Accounting & Financial Transactions | Record money movement and financial truth. | Owner, finance operator, customer, supplier. | Core events must be industry-neutral; source-specific mapping belongs in packs. | amount, currency, source record, method. | transaction, journal impact, reports. | Orders/work orders, accounts, approvals. | Transaction Posted, Payment Recorded, Settlement Completed. | Draft → Posted → Settled/Reversed. | Universal. | Finance Engine. | Accounting Pack. | Templates define document labels/tax defaults. | `routes/$tenant/accounting.tsx`, `routes/$tenant/ledger.tsx`, `lib/rules/payment.ts`, `journal_entries` |
| Documents & Forms | Produce proof, receipts, checklists, contracts. | Owner, actors, customers. | Documents should be templates, not hardcoded print components. | source record, template, numbering. | document, receipt, checklist, printable output. | Orders/work orders, finance, approvals. | Document Issued, Invoice Printed, Form Submitted. | Draft → Issued → Sent/Signed → Archived. | Universal. | Document Engine, Form Engine. | Document Pack. | Laundry intake/delivery/payment docs. | `components/print-invoice.tsx`, `core_documents`, `core_forms`, `routes/$tenant/reports/builder.tsx` |
| Reporting & Dashboards | Answer business questions and guide next actions. | Owner, manager, departments. | Reports should be generated from business model, not component-only logic. | metrics, filters, entity relationships. | reports, dashboards, KPIs, alerts. | All domain entities. | Report Generated, KPI Alert Raised. | Defined → Generated → Reviewed. | Universal. | Reporting Engine. | Reporting Pack / Dashboard Pack. | Templates define starter reports. | `routes/$tenant/reports.tsx`, `routes/$tenant/dashboard.tsx`, `routes/$tenant/executive.tsx` |
| Notifications & Messaging | Tell people what happened or what to do next. | Customers, employees, managers, systems. | Delivery channel is technical; trigger meaning is business knowledge. | event, recipient, template, channel. | notification, customer message, alert. | Domain events, actors, customers. | Notification Queued, Sent, Delivered, Failed. | Created → Queued → Sent/Failed → Read. | Universal. | Notification Engine. | Notification Pack. | Templates define message wording/triggers. | `components/notification-center.tsx`, `lib/rules/whatsapp.ts`, `customer_messages`, `app_notifications` |
| Inventory / Assets | Track stock and important objects. | Ops, finance, suppliers. | Inventory is quantity; asset is individually tracked. | stock item, asset, movement, condition. | stock levels, asset history, alerts. | Branches, suppliers, work orders. | Stock Moved, Asset Assigned, Maintenance Started. | Registered → Active → Consumed/Retired. | Universal capability when DNA requires it. | Asset primitives. | Inventory Pack, Asset Pack. | Template defaults. | `routes/$tenant/inventory.tsx`, `equipment_assets`, `inventory_items`, `inventory_movements` |
| Business Initialization | Turn owner answers into generated organization. | Owner, platform. | MJRH understands, proposes, explains, owner confirms. | operating model, DNA, country, template. | generated organization, first success dashboard. | Generator, packs, templates. | Business Initialized, Platform Generated. | Started → Draft → Generated → Ready. | Universal. | Configuration Engine, Generator. | Business Initialization UX. | Templates supply defaults. | `routes/$tenant/onboarding.tsx`, `lib/core-platform.ts`, `lib/template-registry.ts` |
