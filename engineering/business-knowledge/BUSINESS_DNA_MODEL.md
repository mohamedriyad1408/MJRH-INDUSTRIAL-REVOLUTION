# MJRH Business DNA Model

**Status:** Architecture draft — pending review  
**Purpose:** Define how MJRH understands a business before selecting templates or generating an organization.

---

## 1. Core Idea

Business DNA is now the second layer after the Business Operating Model.

MJRH should not ask only:

```txt
What industry is this?
```

MJRH should first understand the Business Operating Model:

```txt
How does this business fundamentally operate?
```

Then MJRH identifies the Business DNA of this specific business:

```txt
What are the characteristics of this business?
```

Industry name is a shortcut.

The Business Operating Model describes reusable operating patterns.

Business DNA describes one specific business.

---

## 2. Business DNA Definition

Business DNA is the set of specific characteristics of one business that determine how the selected Business Operating Model should be configured.

Business DNA is derived from the Business Operating Model.

Business DNA helps determine which Capability Packs, Templates, workflows, forms, reports, roles, and defaults the platform should propose.

---

## 2.1 Business Operating Model → Business DNA

The Operating Model identifies fundamental patterns.

Business DNA adds the specific details.

Example:

```txt
Business Operating Model:
Service-Based + Workflow/Stage-Based + Inventory-Based + Field Operation

Business DNA:
2 branches, 09:00–22:00, quality control required, payment on delivery, Arabic/English, WhatsApp updates, medium approval sensitivity
```

Business DNA should not be used as a replacement for the Business Operating Model.

It refines the Operating Model.

---

## 3. DNA Dimensions

## 3.1 Staged Work

### Question

```txt
Does work move through multiple stages?
```

### Examples

- receive → process → quality check → deliver
- request → approve → execute → close

### Drives

- Workflow Management Pack
- Task generation
- SLA/delay alerts
- operations reports

---

## 3.2 Manufacturing / Assembly

### Question

```txt
Does the business manufacture, assemble, or transform products?
```

### Drives

- Manufacturing Pack
- Inventory Pack
- Quality checks
- production work orders

---

## 3.3 Inventory

### Question

```txt
Does the business keep, consume, transfer, or sell stock?
```

### Drives

- Inventory Management Pack
- supplier relationships
- reorder alerts
- stock reports

---

## 3.4 Appointments / Reservations

### Question

```txt
Do customers book a time, room, visit, or appointment?
```

### Drives

- Appointment Pack
- calendars
- reminders
- capacity rules

---

## 3.5 Field Visits

### Question

```txt
Does the team visit customers or perform work outside a branch?
```

### Drives

- Field Service Pack
- dispatch
- routing
- mobile work
- location capture

---

## 3.6 Asset Tracking

### Question

```txt
Does the business track physical assets, equipment, rooms, vehicles, or customer-owned items?
```

### Drives

- Asset Management Pack
- maintenance work orders
- asset documents
- lifecycle reports

---

## 3.7 Customer Receives Product, Service, or Both

### Question

```txt
Does the customer receive a product, a service, or both?
```

### Drives

- Service catalog
- Product catalog
- Inventory Pack
- Order structure
- Work Order structure

---

## 3.8 Branch Complexity

### Question

```txt
Does the business operate one location or multiple locations?
```

### Drives

- branch setup
- branch reports
- inventory locations
- cash accounts by branch
- staff assignment

---

## 3.9 Approvals

### Question

```txt
Are approvals needed for discounts, refunds, money, quality, documents, or sensitive actions?
```

### Drives

- Approval Pack
- permission rules
- audit trail
- manager notifications

---

## 3.10 Quality Control

### Question

```txt
Does work need inspection, review, or quality approval before completion?
```

### Drives

- quality tasks
- approval points
- exception reports
- rework workflows

---

## 3.11 Payment Timing

### Question

```txt
When does the customer usually pay?
```

Options:

- before work
- during work
- after work
- subscription
- milestone-based
- mixed

### Drives

- Accounting Pack
- receivables
- invoice/receipt timing
- cash collection workflow

---

## 3.12 Compliance / Documentation

### Question

```txt
Does the business need formal documents, signatures, compliance records, or audits?
```

### Drives

- Document Management Pack
- Legal Pack
- Healthcare Pack
- audit reports

---

## 4. Example DNA Profiles

### Laundry-like business

```json
{
  "staged_work": true,
  "inventory_required": true,
  "appointments_required": false,
  "field_visits_required": true,
  "asset_tracking_required": false,
  "manufacturing_required": false,
  "customer_receives": "service_and_items",
  "quality_control_required": true,
  "approval_level": "medium",
  "payment_timing": "after_or_on_delivery"
}
```

### Clinic-like business

```json
{
  "staged_work": true,
  "inventory_required": true,
  "appointments_required": true,
  "field_visits_required": false,
  "asset_tracking_required": true,
  "manufacturing_required": false,
  "customer_receives": "service",
  "quality_control_required": true,
  "approval_level": "high",
  "payment_timing": "before_or_after_visit"
}
```

### Furniture factory-like business

```json
{
  "staged_work": true,
  "inventory_required": true,
  "appointments_required": false,
  "field_visits_required": false,
  "asset_tracking_required": true,
  "manufacturing_required": true,
  "customer_receives": "product",
  "quality_control_required": true,
  "approval_level": "medium",
  "payment_timing": "milestone_based"
}
```

---

## 5. DNA → Capability Pack Mapping

| DNA signal | Recommended Capability Packs |
|---|---|
| staged_work | Workflow Management Pack, Reporting Pack |
| inventory_required | Inventory Management Pack, Accounting Pack |
| appointments_required | Appointment Pack, Notification Pack |
| field_visits_required | Field Service Pack, Notification Pack |
| asset_tracking_required | Asset Management Pack, Document Management Pack |
| manufacturing_required | Manufacturing Pack, Inventory Pack, Quality/Approval rules |
| customer_receives_service | CRM Pack, Workflow Pack |
| customer_receives_product | Product/Inventory Pack, Accounting Pack |
| approval_required | Approval Pack, Audit/Document rules |
| quality_control_required | Workflow Pack, Document Pack, Reporting Pack |
| compliance_required | Document Pack, Legal/Healthcare Pack, Audit rules |

---

## 6. Operating Model + DNA → Template Rule

Industry Template selection should use the Business Operating Model plus Business DNA as the primary driver.

Industry name may help choose defaults, but it must not override the Operating Model or DNA.

Example:

```txt
A laundry with appointments and home visits
```

may need:

```txt
Laundry Template
+ Appointment Pack
+ Field Service Pack
```

Example:

```txt
A hotel laundry operation
```

may need:

```txt
Laundry Template
+ Hotel/Hospitality Pack
+ Internal Department Billing
```

---

## 7. Owner Experience Rule

The owner should not see a technical DNA profile.

The owner should see simple questions and helpful explanations.

MJRH should then say:

```txt
Based on your answers, we prepared the best starting setup for your business.
```

---

## 8. Final Rule

Business Operating Model + Business DNA drive template generation more than industry name.
