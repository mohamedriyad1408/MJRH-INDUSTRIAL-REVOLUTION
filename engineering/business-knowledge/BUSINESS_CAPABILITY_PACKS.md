# MJRH Business Capability Packs

**Status:** Architecture draft — pending review  
**Purpose:** Define reusable business capability packages used to assemble Industry Templates.

---

## 1. Why Capability Packs Exist

MJRH should not start from industries.

MJRH should start from reusable operating needs.

Capability Packs are selected based on:

```txt
Business Operating Model
+
Business DNA
```

Industry Templates are compositions of Capability Packs.

```txt
Business Operating Model
↓
Business DNA
↓
Capability Packs
↓
Industry Templates
↓
Generated Organizations
```

---

## 2. Pack Definition

A Business Capability Pack is a reusable package of configuration, rules, forms, workflows, reports, and recommended setup that supports one operating capability.

A pack may include:

- business entities used
- default workflows
- forms
- documents
- roles/responsibilities
- approval rules
- reports
- notifications
- setup questions
- validation rules
- sample data definitions

A pack must not contain industry-specific custom backend logic.

---

## 3. Core Capability Packs

## 3.1 Workflow Management Pack

### Purpose

Manage work that moves through stages.

### Provides

- workflow definitions
- stages
- transitions
- task generation
- SLA rules
- delay alerts
- workflow reports

### Used by

Laundry, hotel housekeeping, manufacturing, maintenance, healthcare, legal, construction.

---

## 3.2 Inventory Management Pack

### Purpose

Track stock, consumption, transfers, reorder points, and inventory value.

### Provides

- inventory items
- stock locations
- stock movements
- consumption rules
- reorder alerts
- inventory reports

### Used by

Laundry, manufacturing, retail, restaurant, healthcare, maintenance.

---

## 3.3 Accounting Pack

### Purpose

Manage money, receipts, accounts, settlements, and financial events.

### Provides

- payment methods
- financial transactions
- cash accounts
- receivables/payables
- settlement rules
- accounting reports

### Used by

All commercial organizations.

---

## 3.4 CRM Pack

### Purpose

Manage customers, communication, history, preferences, and customer value.

### Provides

- customer records
- customer history
- segmentation
- follow-up tasks
- retention reports
- customer notifications

### Used by

All customer-facing organizations.

---

## 3.5 Human Resources Pack

### Purpose

Manage team members, responsibilities, attendance, scheduling, and performance.

### Provides

- actors
- roles
- schedules
- attendance
- requests
- performance reports

### Used by

Most organizations with employees.

---

## 3.6 Asset Management Pack

### Purpose

Track important objects over time.

### Provides

- asset registry
- condition history
- assignment
- maintenance work orders
- asset documents
- lifecycle reports

### Used by

Maintenance, manufacturing, healthcare, logistics, real estate, hotels.

---

## 3.7 Manufacturing Pack

### Purpose

Support production, assembly, quality, and output tracking.

### Provides

- production work orders
- bill of materials concepts
- production stages
- quality checks
- material consumption
- output reports

### Used by

Furniture factories, food factories, manufacturing companies.

---

## 3.8 Appointment Pack

### Purpose

Manage bookings, schedules, availability, and time-based service.

### Provides

- appointment calendar
- availability rules
- booking confirmations
- reminder notifications
- no-show/cancellation handling

### Used by

Healthcare, salons, maintenance visits, consultations, hospitality services.

---

## 3.9 Healthcare Pack

### Purpose

Support healthcare-specific operational requirements as configuration.

### Provides

- patient-like customer profiles
- visit records
- clinical forms
- compliance documents
- appointment workflows
- restricted access patterns

### Used by

Clinics, hospitals, labs.

### Rule

Healthcare Pack must still use Core entities such as Customer, Document, Workflow, Task, and Approval. It must not fork the Core.

---

## 3.10 Legal Pack

### Purpose

Support legal cases, documents, deadlines, and approvals.

### Provides

- case-like work orders
- legal documents
- deadline tracking
- approvals
- activity history
- client reports

### Used by

Law firms, compliance teams, contracts departments.

---

## 3.11 Document Management Pack

### Purpose

Manage forms, receipts, contracts, checklists, and official records.

### Provides

- document templates
- numbering
- approvals/signatures
- document status
- exports

### Used by

Almost every organization.

---

## 3.12 Reporting Pack

### Purpose

Answer business questions with structured reports.

### Provides

- operational reports
- financial reports
- quality reports
- customer reports
- branch reports
- team reports

### Used by

All organizations.

---

## 3.13 Notification Pack

### Purpose

Send messages and alerts to actors, customers, suppliers, and systems.

### Provides

- notification triggers
- channel preferences
- customer updates
- internal alerts
- failed delivery tracking

### Used by

All organizations.

---

## 3.14 Field Service Pack

### Purpose

Manage work performed outside the branch.

### Provides

- dispatch
- routing
- field actor assignment
- location capture
- visit tasks
- field status updates

### Used by

Laundry pickup/delivery, maintenance, logistics, home services, healthcare visits.

---

## 4. Selection Example

```txt
Business Operating Model
(Service + Workflow + Inventory)
↓
Business DNA
(Quality Control + Multi Branch)
↓
Capability Packs
↓
Laundry Template
```

The industry name is not the primary decision-maker.

The operating model plus DNA selects the packs.

---

## 5. Template Composition Examples

### Laundry Template

```txt
Workflow Management Pack
+ Inventory Management Pack
+ CRM Pack
+ Accounting Pack
+ Notification Pack
+ Field Service Pack
+ Document Management Pack
+ Reporting Pack
```

### Hotel Template

```txt
Workflow Management Pack
+ Appointment/Reservation Pack
+ Asset Management Pack
+ CRM Pack
+ Accounting Pack
+ Document Management Pack
+ Reporting Pack
```

### Furniture Factory Template

```txt
Manufacturing Pack
+ Inventory Management Pack
+ Workflow Management Pack
+ Asset Management Pack
+ Accounting Pack
+ Reporting Pack
```

### Clinic Template

```txt
Appointment Pack
+ Healthcare Pack
+ CRM Pack
+ Document Management Pack
+ Accounting Pack
+ Notification Pack
+ Reporting Pack
```

### Construction Company Template

```txt
Workflow Management Pack
+ Asset Management Pack
+ Inventory Management Pack
+ Field Service Pack
+ Document Management Pack
+ Accounting Pack
+ Reporting Pack
```

---

## 6. Pack Governance Rules

1. Packs must use the Business Knowledge Model.
2. Packs must not duplicate Core logic.
3. Packs must not hardcode one customer/demo organization.
4. Packs may include default configuration but must remain replaceable.
5. Packs may be composed into templates.
6. Packs must define what entities they use.
7. Packs must define what setup questions they require.
8. Packs must define validation and success criteria.

---

## 7. Future Pack Registry

Future implementation should introduce a registry for packs, similar to the Template Registry.

Potential tables/concepts:

- capability_pack_registry
- capability_pack_assets
- template_pack_composition
- business_dna_pack_rules

No implementation should begin until the pack model is reviewed.
