# MJRH Business Knowledge Model

**Status:** Foundational architecture document — required before implementation  
**Branch:** `feature/mjrh-v3-core-platform`  
**Purpose:** Define the stable business language of MJRH  
**Principle:** Code changes. UI changes. Database structures may change. The business language must remain stable.

---

## 1. Why This Document Exists

MJRH is not only a software system.

MJRH is an operational knowledge system.

If the team does not share one stable business language, the codebase will drift into disconnected features, industry assumptions, and duplicated logic.

This document defines the business objects MJRH understands and the relationships between them.

The goal is to make every future screen, table, API, workflow, template, and capability pack use the same language.

---

## 2. Core Internal Principle

```txt
The software should know more about running a business than the business owner does.
```

This means MJRH should:

1. understand the business being built,
2. propose a safe operating model,
3. explain why it is proposing it,
4. ask for confirmation,
5. warn when something is risky or incomplete.

The refined operating phrase is:

```txt
MJRH understands, proposes, explains, then asks for confirmation.
```

---

## 3. Business DNA

The first question should not be:

```txt
What does your business do?
```

The first question should be:

```txt
What kind of business are you building?
```

The answer is not only an industry name.

MJRH must understand the **Business DNA** — the operating characteristics that determine how the business should work.

### 3.1 Business DNA Questions

MJRH should learn whether the business has:

| Question | Why it matters |
|---|---|
| Does the service follow stages? | Determines whether a workflow lifecycle is needed. |
| Is a product manufactured or assembled? | Determines manufacturing, production, BOM, and quality needs. |
| Is inventory used or consumed? | Determines inventory tracking and stock movement needs. |
| Are appointments or reservations required? | Determines scheduling and calendar capabilities. |
| Are field visits required? | Determines route, dispatch, mobile work, and location capabilities. |
| Are assets or equipment managed? | Determines asset lifecycle, maintenance, and assignment needs. |
| Does the customer receive a product, a service, or both? | Determines order/work order/document behavior. |
| Is work performed at a branch, in the field, or both? | Determines branches, dispatch, location, and team assignment. |
| Are approvals required? | Determines permission and approval rules. |
| Does money get collected before, during, or after work? | Determines finance events and receivables. |
| Is compliance or documentation important? | Determines document and audit requirements. |
| Is the same work repeated often or customized each time? | Determines templates, forms, and task generation. |

### 3.2 Business DNA Output

Business DNA should produce an internal capability profile, for example:

```json
{
  "staged_work": true,
  "inventory_required": true,
  "appointments_required": false,
  "field_visits_required": true,
  "asset_management_required": false,
  "manufacturing_required": false,
  "customer_receives": "product_and_service",
  "payment_timing": "after_work",
  "approval_sensitivity": "medium"
}
```

The owner should not see this JSON.

The owner should experience this as simple questions and helpful recommendations.

---

## 4. Capability Packs

Industry Templates should not be the first reusable layer.

Before Industry Templates, MJRH needs **Business Capability Packs**.

A Capability Pack is a reusable configuration and behavior package that solves one operating need.

Examples:

- Workflow Pack
- Inventory Pack
- Appointment Pack
- Manufacturing Pack
- Asset Management Pack
- Healthcare Pack
- CRM Pack
- Legal Pack
- Accounting Pack
- Field Service Pack
- Document Pack
- Approval Pack
- Reporting Pack

### 4.1 Relationship Between Packs and Templates

```txt
Core Platform
↓
Business Capability Packs
↓
Industry Templates
↓
Generated Organizations
```

An Industry Template becomes a composition of Capability Packs.

Example:

```txt
Laundry Template
= Workflow Pack
+ Inventory Pack
+ CRM Pack
+ Accounting Pack
+ Field Service Pack
+ Document Pack
```

Example:

```txt
Clinic Template
= Appointment Pack
+ Healthcare Pack
+ CRM Pack
+ Document Pack
+ Accounting Pack
+ Approval Pack
```

Example:

```txt
Furniture Factory Template
= Manufacturing Pack
+ Inventory Pack
+ Workflow Pack
+ Asset Management Pack
+ Accounting Pack
+ Quality Pack
```

### 4.2 Why Capability Packs Matter

Capability Packs make new industries faster to create because MJRH no longer starts from industry names.

MJRH starts from operating needs.

Industry names become presets, not architecture.

---

## 5. Core Business Objects

## 5.1 Organization

An Organization is the business account being operated in MJRH.

It represents one company, business unit, or operating entity.

An Organization owns:

- branches
- departments
- actors
- customers
- services
- workflows
- orders
- work orders
- tasks
- assets
- documents
- financial events
- reports
- configuration

### Rule

No data from one Organization may leak into another Organization.

---

## 5.2 Branch

A Branch is a physical or operational location where business activity is managed.

A Branch may be:

- a store
- an office
- a production site
- a warehouse
- a clinic location
- a service hub
- a dispatch hub
- a virtual operating location

A Branch answers:

```txt
Where is this work managed from?
```

A Branch may contain:

- employees
- orders
- work orders
- inventory
- cash accounts
- reports
- local schedules

### Branch vs Department

A Branch is about **location**.

A Department is about **responsibility**.

---

## 5.3 Department

A Department is a responsibility area inside an Organization.

A Department answers:

```txt
Who is responsible for this type of work?
```

Examples can vary by template:

- customer handling
- operations
- production
- quality
- finance
- delivery
- compliance
- maintenance

The Core Platform must not assume which departments exist.

Departments are generated by Capability Packs and Templates.

### Department vs Workflow Step

A Department owns responsibility.

A Workflow Step represents progress.

A workflow step may be handled by one department or multiple departments.

---

## 5.4 Actor

An Actor is any person, team, system, or external party that performs or influences work.

Actors may include:

- owner
- employee
- manager
- courier
- technician
- accountant
- customer
- supplier
- automated system
- integration

An Actor answers:

```txt
Who can do something?
```

Actors have:

- identity
- role/responsibility
- permissions
- assignments
- activity history

### Actor vs Role

An Actor is the real performer.

A Role is the responsibility or permission pattern assigned to the Actor.

---

## 5.5 Role

A Role defines what an Actor is allowed or expected to do.

A Role answers:

```txt
What can this actor do?
```

A Role may define:

- allowed screens
- allowed actions
- approval authority
- assigned work types
- reporting access

The Core Platform should understand permissions and relationships, not job titles.

Job-title-like roles come from Capability Packs and Templates.

---

## 5.6 Customer

A Customer is the person or organization receiving value from the business.

A Customer may:

- place an order
- request a service
- book an appointment
- own an asset
- receive delivery
- pay money
- receive documents and messages

A Customer answers:

```txt
Who is the business serving?
```

Customers may have:

- contact details
- addresses
- preferences
- history
- payment status
- owned assets
- appointments
- documents

---

## 5.7 Service

A Service is something the business offers or performs for a customer.

A Service answers:

```txt
What can the customer ask for or buy?
```

A Service may be:

- fixed-price
- quantity-based
- time-based
- custom-priced
- attached to a product
- attached to an asset
- part of a workflow

### Service vs Product

A Product is a thing.

A Service is work performed.

Some businesses deliver both.

MJRH must support both without forcing every industry into one model.

---

## 5.8 Asset

An Asset is a tracked object that has operational value or history.

An Asset may be:

- equipment
- machine
- vehicle
- room
- device
- customer-owned item
- tool
- property
- medical device
- production line

An Asset answers:

```txt
What important object do we need to track over time?
```

An Asset may have:

- owner
- location
- condition
- maintenance history
- assignment
- documents
- financial value
- lifecycle status

### Asset vs Inventory Item

An Asset is individually tracked over time.

Inventory is usually tracked by quantity, stock, movement, and consumption.

---

## 5.9 Inventory Item

An Inventory Item is stock that can be counted, consumed, transferred, purchased, sold, or reserved.

An Inventory Item answers:

```txt
What quantity do we have and where is it?
```

Inventory may support:

- stock levels
- purchases
- transfers
- consumption
- reservations
- reorder alerts
- cost tracking

---

## 5.10 Workflow

A Workflow is the path work follows from start to finish.

A Workflow answers:

```txt
How does work move?
```

A Workflow may define:

- stages
- transitions
- required information
- responsible roles
- approvals
- SLA expectations
- documents
- notifications
- financial events

The Workflow Engine executes workflows.

The Workflow Engine must not define industries.

Workflows come from Capability Packs, Templates, or customer configuration.

---

## 5.11 Order

An Order is a customer-facing commercial request.

An Order answers:

```txt
What did the customer ask for, and what do they owe?
```

An Order may include:

- customer
- services/products
- price
- discount
- tax
- payment status
- delivery details
- receipt/invoice
- related work orders

### Order purpose

The Order is primarily about the customer commitment and commercial record.

---

## 5.12 Work Order

A Work Order is an internal execution record for work that must be performed.

A Work Order answers:

```txt
What work must the team do?
```

A Work Order may be created from:

- an Order
- an appointment
- a maintenance request
- a production plan
- a customer complaint
- an internal task
- an asset issue

A Work Order may include:

- workflow
- assigned actors
- tasks
- status
- due date
- required inputs
- outputs
- quality checks
- documents

### Order vs Work Order

An Order is customer/commercial.

A Work Order is operational/execution.

One Order may create one or many Work Orders.

Some Work Orders may exist without a customer Order.

Example:

- maintenance of company equipment
- internal stock count
- quality inspection

---

## 5.13 Task

A Task is a specific action assigned to an Actor.

A Task answers:

```txt
What exactly should someone do next?
```

A Task may belong to:

- a Work Order
- a Workflow Step
- an Approval
- a Customer issue
- an Asset event
- an internal operation

A Task has:

- actor or team
- due time
- instructions
- required input
- status
- completion proof

### Work Order vs Task

A Work Order is the container for operational work.

A Task is an actionable unit inside that work.

---

## 5.14 Document

A Document is a formal or operational record produced or required by the business.

A Document answers:

```txt
What proof, receipt, form, or record is needed?
```

Documents may include:

- receipt
- invoice
- delivery note
- intake form
- inspection checklist
- approval record
- contract
- medical form
- maintenance report
- production sheet

Documents may be generated from templates.

---

## 5.15 Financial Event

A Financial Event is a money-related business event.

A Financial Event answers:

```txt
What happened financially?
```

Generic examples:

- Transaction
- Adjustment
- Allocation
- Settlement
- Approval
- Transfer

Forbidden in Core:

- Laundry Payment
- Hotel Invoice
- Garment Charge
- Hospital Bill

Industry-specific financial meaning belongs in templates/configuration, not Core event names.

---

## 5.16 Report

A Report is a structured answer to a business question.

A Report answers:

```txt
What does the owner need to know?
```

Reports may cover:

- operations
- finance
- customers
- staff
- quality
- delays
- inventory
- sales
- compliance

Reports should be generated from the same business model, not hardcoded per industry.

---

## 6. Relationship Model

## 6.1 Core Relationships

```txt
Organization
├── Branches
├── Departments
├── Actors
├── Customers
├── Services
├── Assets
├── Inventory Items
├── Workflows
├── Documents
├── Financial Events
└── Reports
```

```txt
Customer
└── Orders
    ├── Order Items
    ├── Payments / Financial Events
    ├── Documents
    └── Work Orders
        └── Tasks
```

```txt
Workflow
└── Stages
    └── Tasks / Work Orders
```

```txt
Asset
├── Work Orders
├── Maintenance History
├── Documents
└── Financial Events
```

---

## 6.2 Order, Work Order, Task Relationship

```txt
Order
= what the customer requested and pays for

Work Order
= what the business must execute

Task
= what a specific actor must do next
```

Example:

```txt
Customer Order: Clean 10 items
↓
Work Order: Process laundry batch
↓
Tasks:
- Receive items
- Sort items
- Clean items
- Finish items
- Check quality
- Pack items
- Deliver items
```

Another example:

```txt
Internal Work Order: Repair washing machine
↓
Tasks:
- Inspect machine
- Request spare part
- Approve cost
- Complete repair
- Record downtime
```

No customer Order is required in the second example.

---

## 7. Business Language Rules

### 7.1 Use stable business words

Use:

- Organization
- Branch
- Department
- Actor
- Role
- Customer
- Service
- Asset
- Inventory Item
- Workflow
- Order
- Work Order
- Task
- Document
- Financial Event
- Report

### 7.2 Avoid unstable implementation words in product language

Avoid customer-facing use of:

- tenant
- schema
- engine
- blueprint
- migration
- table
- RPC
- RLS
- template asset
- internal route

These may exist in engineering documents but should not appear in owner-facing product UI.

---

## 8. Template and Pack Rules

### 8.1 Core Platform

The Core Platform defines capabilities and relationships.

It does not define industries.

### 8.2 Capability Packs

Capability Packs define reusable operating needs.

Examples:

- staged work
- inventory
- appointment scheduling
- manufacturing
- asset management
- field service
- CRM
- legal/compliance

### 8.3 Industry Templates

Industry Templates compose Capability Packs into a starting business model.

They are presets, not architecture.

### 8.4 Organizations

Organizations are generated from Templates and Packs, then customized by owners.

---

## 9. Dry Tech Gold Standard Rule

Dry Tech is the Official Gold Standard Organization.

It validates that MJRH works for a complete, realistic business.

Every new platform capability must be validated against Dry Tech before approval.

However:

- Dry Tech is not a development environment.
- Dry Tech is not a sandbox.
- Dry Tech must not be manually maintained long-term.
- Dry Tech should become reproducible through Template → Platform Generator → Demo Data Import.

---

## 10. Identity Preservation Rule

During generation, restoration, or migration, the absolute rule is not “preserve every ID.”

The absolute rule is:

```txt
Preserve relationships and data integrity.
```

IDs may be preserved when useful.

IDs may change if there is a valid architectural reason.

But relationships, auditability, historical meaning, and operational integrity must never be broken.

---

## 11. Open Questions for Future Review

1. Should “Product” become a first-class Core object separate from Service?
2. Should Appointment be a Core object or a Capability Pack object?
3. Should Case be introduced for healthcare/legal/support-style work?
4. Should Work Order replace legacy Order-driven operational logic over time?
5. How should demo seed packs represent realistic operational history declaratively?
6. How should Business DNA scoring select Capability Packs automatically?

---

## 12. Final Principle

MJRH should not start from industry names.

MJRH should start from how the business operates.

Industry names are shortcuts.

Business DNA is the truth.
