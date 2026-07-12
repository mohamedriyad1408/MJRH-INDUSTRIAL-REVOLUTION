# MJRH Business Relationship Model

**Status:** Architecture draft — pending review  
**Purpose:** Define the single source of truth for how business entities connect.

---

## 1. Top-Level Relationship Diagram

```txt
Organization
├── Branches
│   ├── Actors
│   ├── Assets
│   ├── Inventory Items
│   ├── Orders
│   ├── Work Orders
│   └── Financial Transactions
├── Departments
│   ├── Actors
│   ├── Workflows
│   ├── Tasks
│   └── Reports
├── Actors
│   ├── Roles
│   ├── Tasks
│   ├── Approvals
│   └── Notifications
├── Customers
│   ├── Orders
│   ├── Work Orders
│   ├── Assets
│   ├── Documents
│   └── Financial Transactions
├── Suppliers
│   ├── Products
│   ├── Inventory Items
│   ├── Documents
│   └── Financial Transactions
├── Services / Products
│   ├── Orders
│   ├── Work Orders
│   └── Financial Transactions
├── Workflows
│   ├── Work Orders
│   ├── Tasks
│   ├── Approvals
│   ├── Documents
│   └── Notifications
├── Orders
│   ├── Order Items
│   ├── Work Orders
│   ├── Documents
│   └── Financial Transactions
├── Work Orders
│   ├── Tasks
│   ├── Actors
│   ├── Assets
│   ├── Documents
│   ├── Approvals
│   └── Notifications
└── Reports
```

---

## 2. Relationship Rules

## 2.1 Organization is the ownership boundary

Every operational record must belong to one Organization.

No operational data may be shared across Organizations unless explicitly modeled as a platform-level template or marketplace asset.

---

## 2.2 Branch is location context

A Branch may contain or manage:

- actors
- orders
- work orders
- inventory
- assets
- financial activity

A Branch is not a Department.

---

## 2.3 Department is responsibility context

A Department owns responsibility, not necessarily physical location.

Departments may span branches.

---

## 2.4 Actor performs actions

Actors execute tasks, request approvals, receive notifications, and create activity history.

Actors are controlled by Roles.

---

## 2.5 Customer creates demand

Customers are linked to Orders, Work Orders, Assets, Documents, Notifications, and Financial Transactions.

---

## 2.6 Supplier supports supply

Suppliers are linked to Products, Inventory, procurement, Documents, and Financial Transactions.

---

## 2.7 Services and Products define what is sold or performed

Orders may include Services, Products, or both.

Services may create Work Orders.

Products may affect Inventory or Manufacturing.

---

## 2.8 Order is customer/commercial

An Order represents what the Customer requested and what they owe.

An Order may generate one or more Work Orders.

---

## 2.9 Work Order is execution/internal

A Work Order represents what the business must do.

It may exist with or without an Order.

---

## 2.10 Task is action-level

A Task belongs to a Work Order, Workflow Stage, Approval, or operational need.

A Task is assigned to an Actor or team.

---

## 2.11 Workflow defines movement

A Workflow defines how Work Orders and Tasks move from start to finish.

Workflow must be template/configuration-driven.

---

## 2.12 Financial Transaction records money movement

Financial Transactions must link to their source when possible:

- Order
- Work Order
- Customer
- Supplier
- Document
- Approval
- Account

---

## 3. Order → Work Order → Task Pattern

```txt
Order
(customer request and commercial value)
↓
Work Order
(internal execution container)
↓
Task
(specific action assigned to actor)
```

Example:

```txt
Order: Customer requests service
↓
Work Order: Fulfill customer request
↓
Tasks:
- Receive request
- Prepare work
- Perform service
- Check quality
- Deliver result
- Close work
```

---

## 4. Asset-Driven Work Pattern

```txt
Asset
↓
Work Order
↓
Tasks
↓
Documents / Financial Transactions
```

Example:

```txt
Machine
↓
Maintenance Work Order
↓
Inspection Task
↓
Repair Task
↓
Maintenance Report
↓
Cost Transaction
```

---

## 5. Appointment-Driven Work Pattern

```txt
Customer
↓
Appointment
↓
Work Order
↓
Tasks
↓
Documents / Financial Transactions
```

Appointment may become a first-class entity later or remain a Capability Pack entity depending on approved model.

---

## 6. Manufacturing Pattern

```txt
Product
↓
Manufacturing Work Order
↓
Inventory Consumption
↓
Production Tasks
↓
Quality Approval
↓
Finished Product / Output
↓
Financial Transactions
```

---

## 7. Reporting Relationships

Reports should read from business relationships, not industry-specific assumptions.

Examples:

```txt
Operations Report = Work Orders + Tasks + Workflow status
Financial Report = Financial Transactions + Orders + Accounts
Customer Report = Customers + Orders + Payments + Notifications
Quality Report = Work Orders + Tasks + Approvals + Documents
Inventory Report = Inventory Items + Movements + Products
```

---

## 8. Relationship Integrity Rule

During generation, restoration, migration, or import:

```txt
Preserve relationships and data integrity.
```

IDs are tools.

Relationships are the truth.
