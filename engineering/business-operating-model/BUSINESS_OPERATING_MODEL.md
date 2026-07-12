# MJRH Business Operating Model

**Status:** Sprint 0.6 foundational architecture document — pending review  
**Branch:** `feature/mjrh-v3-core-platform`  
**Scope:** Industry-independent description of how businesses fundamentally operate  
**Rule:** MJRH starts from how the business operates, not from the industry name.

---

## 1. Why This Layer Exists

MJRH should not start by asking only:

```txt
What industry is this?
```

MJRH must first understand:

```txt
How does this business fundamentally operate?
```

Industry names are shortcuts.

Operating models are the real architecture.

A laundry, hotel, hospital, factory, construction company, and maintenance company may share many operating patterns even if their industry names are different.

The Business Operating Model is the layer that identifies those reusable patterns before Business DNA, Capability Packs, or Templates are selected.

---

## 2. Official Architecture Layering

The official architecture becomes:

```txt
Core Platform
↓
Business Operating Model
↓
Business DNA
↓
Business Capability Packs
↓
Industry Templates
↓
Generated Demo Organizations
↓
Customer Organizations
```

### Layer meaning

| Layer | Meaning |
|---|---|
| Core Platform | Generic capabilities only. No industry knowledge. |
| Business Operating Model | Reusable patterns describing how a business operates. |
| Business DNA | Specific characteristics of one business. |
| Business Capability Packs | Composable capability packages selected from operating model + DNA. |
| Industry Templates | Replaceable presets assembled from capability packs. |
| Generated Demo Organizations | Disposable proof/demo organizations generated from templates. |
| Customer Organizations | Real businesses generated from the same mechanism. |

---

## 3. Business Operating Model Definition

A Business Operating Model describes the fundamental way a business creates value, performs work, serves customers, manages resources, collects money, and controls risk.

It is independent of industry names.

It answers questions such as:

- Does the business provide services?
- Does the business sell products?
- Does it manufacture or assemble products?
- Does it execute projects?
- Does work move through stages?
- Does it operate through appointments?
- Does it perform field operations?
- Does it use inventory?
- Does it manage physical assets?
- Does it require quality control?
- Does it require approvals?
- Does it require compliance documentation?
- Does it run recurring operations?
- Does it handle one-time jobs?
- Does work start from customer requests?
- Does work start from internal execution needs?

---

## 4. Core Operating Characteristics

## 4.1 Service-Based Operation

### Definition

The business performs work for a customer or internal stakeholder.

### Examples

- cleaning
- maintenance
- consultation
- medical visit
- legal service
- delivery service

### Implications

Usually requires:

- service catalog
- customer requests
- work orders
- tasks
- status tracking
- customer communication
- financial transactions

---

## 4.2 Product-Based Operation

### Definition

The business sells, delivers, rents, or manages products.

### Examples

- retail store
- spare parts business
- food products
- manufactured goods

### Implications

Usually requires:

- product catalog
- inventory
- pricing
- suppliers
- stock movement
- sales reports

---

## 4.3 Manufacturing / Production Operation

### Definition

The business transforms inputs into outputs through production or assembly.

### Examples

- furniture factory
- food factory
- garment production
- assembly workshop

### Implications

Usually requires:

- production work orders
- inventory consumption
- materials
- stages
- quality control
- output tracking
- cost tracking

---

## 4.4 Project-Based Operation

### Definition

The business executes long-running scoped work with milestones, deliverables, resources, and approvals.

### Examples

- construction project
- fit-out project
- implementation project
- legal case/project

### Implications

Usually requires:

- project records
- milestones
- tasks
- budgets
- documents
- approvals
- progress reports

---

## 4.5 Appointment-Based Operation

### Definition

Work depends on scheduled time slots, availability, capacity, reservations, or visits.

### Examples

- clinic appointment
- hotel reservation
- maintenance booking
- consultation session

### Implications

Usually requires:

- calendar
- capacity
- reminders
- no-show/cancellation handling
- assigned actors/resources

---

## 4.6 Workflow / Stage-Based Operation

### Definition

Work moves through known steps before completion.

### Examples

- receive → process → quality check → deliver
- request → approve → execute → close
- manufacture → inspect → package → ship

### Implications

Usually requires:

- workflows
- stages
- transitions
- work orders
- tasks
- SLA tracking
- delay alerts

---

## 4.7 Field Operation

### Definition

Work is performed outside the branch or office.

### Examples

- pickup and delivery
- field maintenance
- inspection visits
- home healthcare visits

### Implications

Usually requires:

- dispatch
- routing
- mobile work
- location capture
- field actor assignment
- field notifications

---

## 4.8 Inventory-Based Operation

### Definition

The business tracks stock that is consumed, sold, transferred, purchased, reserved, or produced.

### Examples

- chemicals and packaging
- spare parts
- retail products
- raw materials
- medical supplies

### Implications

Usually requires:

- inventory items
- stock movements
- suppliers
- reorder alerts
- stock valuation
- inventory reports

---

## 4.9 Asset-Based Operation

### Definition

The business tracks important physical or digital objects individually over time.

### Examples

- vehicles
- machines
- rooms
- equipment
- customer-owned assets
- production lines

### Implications

Usually requires:

- asset registry
- assignment
- maintenance work orders
- condition history
- asset documents
- lifecycle status

---

## 4.10 Quality-Control Operation

### Definition

Work must be checked, approved, inspected, or corrected before completion.

### Examples

- laundry QC
- manufacturing inspection
- medical review
- legal document review

### Implications

Usually requires:

- quality tasks
- checklists
- approval points
- exception handling
- rework workflows
- quality reports

---

## 4.11 Approval-Controlled Operation

### Definition

Certain actions require permission before proceeding.

### Examples

- discount approval
- refund approval
- quality approval
- compliance approval
- purchase approval

### Implications

Usually requires:

- approval rules
- approvers
- thresholds
- audit trail
- notifications

---

## 4.12 Compliance / Documentation Operation

### Definition

The business must produce, store, sign, audit, or retrieve formal records.

### Examples

- contracts
- receipts
- medical forms
- inspection reports
- compliance records

### Implications

Usually requires:

- document templates
- numbering
- signatures
- retention rules
- audit trail

---

## 4.13 Recurring Operation

### Definition

Work repeats on a schedule or subscription basis.

### Examples

- weekly cleaning
- subscription service
- preventive maintenance
- recurring appointments

### Implications

Usually requires:

- recurrence rules
- scheduled work orders
- automatic reminders
- subscription billing
- recurring reports

---

## 4.14 One-Time Job Operation

### Definition

Work is created as individual requests or jobs that do not necessarily repeat.

### Examples

- repair request
- custom furniture order
- one-time delivery
- legal consultation

### Implications

Usually requires:

- request intake
- estimate/quote
- work order
- status tracking
- payment collection

---

## 4.15 Customer-Request Operation

### Definition

Work begins when a customer makes a request.

### Implications

Usually requires:

- customer intake
- order/request record
- communication
- work execution
- customer-facing status

---

## 4.16 Internal-Execution Operation

### Definition

Work begins internally, even without a customer request.

### Examples

- asset maintenance
- inventory count
- staff task
- quality audit
- internal production

### Implications

Usually requires:

- internal work orders
- task assignment
- internal approvals
- operational reports

---

## 5. Industries as Operating Model Compositions

Industries are combinations of operating characteristics.

### Laundry example

```txt
Service-Based
+ Workflow / Stage-Based
+ Inventory-Based
+ Field Operation
+ Quality-Control
+ Customer-Request
+ Accounting
+ Notifications
```

### Hotel example

```txt
Appointment / Reservation-Based
+ Asset-Based
+ Workflow / Stage-Based
+ Service-Based
+ Customer-Request
+ Housekeeping Operations
+ Accounting
```

### Furniture Factory example

```txt
Manufacturing / Production
+ Inventory-Based
+ Workflow / Stage-Based
+ Quality-Control
+ Asset-Based
+ Project/Order-Based
+ Accounting
```

### Clinic example

```txt
Appointment-Based
+ Service-Based
+ Compliance / Documentation
+ Asset-Based
+ Customer-Request
+ Quality-Control
+ Accounting
```

---

## 6. Business Operating Model → Business DNA

The Business Operating Model identifies reusable operating patterns.

Business DNA describes the specific configuration of one business using those patterns.

Example:

```txt
Operating Model:
Service-Based + Workflow + Inventory + Field Operation

Business DNA:
2 branches, 09:00–22:00, quality control required, payment on delivery, Arabic/English, uses WhatsApp, medium approval sensitivity
```

---

## 7. Business Operating Model → Capability Packs

Operating characteristics suggest Capability Packs.

| Operating characteristic | Likely capability packs |
|---|---|
| Service-Based | CRM Pack, Workflow Pack, Accounting Pack |
| Product-Based | Product/Inventory Pack, Accounting Pack |
| Manufacturing | Manufacturing Pack, Inventory Pack, Quality Pack |
| Project-Based | Workflow Pack, Document Pack, Approval Pack, Reporting Pack |
| Appointment-Based | Appointment Pack, Notification Pack, CRM Pack |
| Field Operation | Field Service Pack, Notification Pack |
| Inventory-Based | Inventory Pack, Supplier/Accounting capabilities |
| Asset-Based | Asset Management Pack, Maintenance workflows |
| Quality-Control | Workflow Pack, Document Pack, Approval Pack |
| Approval-Controlled | Approval Pack, Audit rules |
| Compliance | Document Pack, Legal/Healthcare Pack, Audit rules |
| Recurring | Scheduling/Subscription capabilities |

---

## 8. Owner Experience

The owner should not be asked to understand this model technically.

The owner should experience it as simple guided questions:

```txt
What kind of business are you building?
Does work move through steps?
Do you visit customers?
Do you keep stock?
Do customers book appointments?
Do you track equipment or assets?
```

MJRH then says:

```txt
Based on how your business works, we prepared the best starting setup for you.
```

---

## 9. Rules

1. Business Operating Model comes before Business DNA.
2. Business DNA comes before Capability Packs.
3. Capability Packs come before Industry Templates.
4. Industry Templates are compositions, not custom code.
5. No industry name may bypass the operating model.
6. If two industries share an operating pattern, that pattern belongs in a Capability Pack.

---

## 10. Final Principle

MJRH should understand how the business operates before it decides what template to generate.
