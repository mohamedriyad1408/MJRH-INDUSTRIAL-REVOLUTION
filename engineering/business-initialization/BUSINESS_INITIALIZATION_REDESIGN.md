# Business Initialization Redesign

**Status:** Design proposal — not approved for implementation yet  
**Objective:** Replace Setup Version 1 with a business-owner friendly initialization journey that minimizes owner decisions  
**Target user:** Non-technical business owner  
**Core rule:** Avoid technical, developer, and ERP terminology  
**Primary design goal:** MJRH understands, proposes, explains, then asks for confirmation

---

## 1. Product Experience Goal

The experience should feel like a business advisor helping the owner build the company step by step.

The objective is not to make the owner configure more.

The objective is to minimize the number of business decisions required from the owner.

MJRH should intelligently propose defaults based on business type, country, template, and local operating norms.

The owner should confirm rather than configure whenever possible.

MJRH should follow this sequence:

```txt
understand → propose → explain → confirm
```

The owner should never feel lost.

Every screen must answer:

1. **Why am I answering this?**
2. **How will this affect my business?**
3. **Can I change it later?**

---

## 2. Language Rules

### Use simple business language

Use:

- Your business
- Your locations
- Your team
- Your services
- Your customers
- How work moves
- How you collect money
- Receipts and numbers
- Who can approve
- Messages to customers

Avoid:

- tenant
- schema
- engine
- workflow blueprint
- template asset
- ERP
- configuration object
- RLS
- migration
- database
- entity
- internal route

### Engineering mapping stays hidden

Behind the scenes:

- “Your team” may map to roles and actors.
- “How work moves” may map to workflows.
- “Receipts and numbers” may map to documents and numbering.
- “Who can approve” may map to permissions and approval rules.

But these internal names should not appear in the customer experience.

---

## 3. Proposed User Journey

```txt
Welcome
↓
Understand Business DNA
↓
Select Capability Packs
↓
Confirm recommended starting plan
↓
Business identity
↓
Locations
↓
Services or work types
↓
Team and responsibilities
↓
How work moves
↓
Money and receipts
↓
Customer messages
↓
Review
↓
Build my business
↓
Ready dashboard
```

The owner should be able to save progress and return later.

The platform should not open operational screens until initialization is complete.


---

## 3.1 Business DNA Before Industry Name

The first business question should be:

```txt
What kind of business are you building?
```

The answer should not be reduced to an industry label such as Laundry or Hotel.

MJRH must understand operating characteristics:

- Does work move through stages?
- Is something manufactured or assembled?
- Is inventory used?
- Are appointments needed?
- Are field visits needed?
- Are assets or equipment tracked?
- Does the customer receive a product, a service, or both?
- Are approvals important?
- When does money get collected?

These answers form the Business DNA.

Business DNA chooses Capability Packs.

Capability Packs then compose the Industry Template.

```txt
Business DNA
↓
Capability Packs
↓
Industry Template
↓
Generated Organization
```

---

## 4. Proposed Screen Sequence

### Screen 1 — Welcome

**Customer-facing title:**

```txt
Let's build your business
```

**Purpose:**

Set expectations and reassure the owner.

**Message:**

```txt
We will ask a few simple questions, then MJRH will prepare your workspace, team areas, work steps, receipts, reports, and customer messages.
```

**Answers the three questions:**

- Why? To prepare the system around the way your business works.
- Effect? Your answers decide what appears after setup.
- Can change later? Yes, most settings can be edited later.

**Fields:**

No data fields.

**Actions:**

- Start
- Continue later if returning user

---

### Screen 2 — What kind of business are you building?

**Customer-facing title:**

```txt
What kind of business are you building?
```

**Purpose:**

Understand the operating characteristics of the business, then choose recommended Capability Packs and a starting plan.

**Field:**

```txt
Business type
```

**Examples:**

- Laundry and cleaning
- Hotel or hospitality
- Clinic or hospital
- Restaurant or food service
- Factory or production
- Construction or projects
- Retail store
- Maintenance service
- Other

Additional simple DNA questions:

- Does your work move through stages?
- Do you use inventory?
- Do customers book appointments?
- Do you visit customers in the field?
- Do you track assets or equipment?
- Does the customer receive a product, a service, or both?

**Required:** Business type/example and country. Other questions should use smart recommended defaults where possible.

**Help message:**

```txt
This helps MJRH understand how your business operates, then suggest the safest starting setup. You can still edit the details before we build your workspace.
```

**Validation:**

- one option required
- if Other, ask for a short description

**Internal mapping:**

- selected industry template

---

### Screen 3 — Recommended starting plan

**Customer-facing title:**

```txt
Here is your recommended starting plan
```

**Purpose:**

Show what MJRH will prepare based on the selected business type.

**Content:**

- suggested work areas
- suggested team responsibilities
- suggested work steps
- suggested receipts/documents
- suggested reports

**Actions:**

- Use this plan
- Customize before starting

**Required:** Yes

**Help message:**

```txt
This is only a starting point. You can add, remove, or rename items now or later.
```

**Internal mapping:**

- template preview
- template asset selection

---

### Screen 4 — Business identity

**Customer-facing title:**

```txt
Tell us about your business
```

**Fields:**

| Field | Required | Help |
|---|---|---|
| Business name | Yes | This appears on dashboards, receipts, and reports. |
| Public business name | Optional | Use this if customers know you by a different name. |
| Country | Yes | Helps set currency, tax, and phone format. |
| City | Optional | Helps prepare branches and service areas. |
| Main language | Yes | You can add more languages later. |
| Logo | Optional | You can upload it later. |
| Brand color | Optional | Used in customer-facing screens. |

**Validation:**

- business name: 2–80 characters
- country required
- language required

---

### Screen 5 — Locations

**Customer-facing title:**

```txt
Where does your business operate?
```

**Fields:**

| Field | Required | Help |
|---|---|---|
| Main location name | Yes | Example: Main Branch, Downtown Branch. |
| Address | Optional | Helps with delivery, reports, and branch records. |
| Add another location | Optional | Add more if you already have multiple branches. |
| Do you offer pickup/delivery? | Optional | Helps prepare maps and delivery work. |

**Validation:**

- at least one location name required
- branch names must not be duplicates

**Can change later:** Yes

---

### Screen 6 — Services or work types

**Customer-facing title:**

```txt
What do you sell or deliver to customers?
```

**Purpose:**

Define the basic catalog of what the business provides.

**Fields:**

| Field | Required | Help |
|---|---|---|
| Use recommended services | Optional | Start quickly with common items. |
| Add service/work type | Optional | You can add prices now or later. |
| Price | Optional | Needed for receipts and financial reports. |
| Category | Optional | Helps organize services. |

**Recommended copy:**

```txt
You do not need to add everything now. Add the most common services first. You can complete the catalog later.
```

**Validation:**

- If no services are entered, allow setup to continue only if the owner confirms they will add services later.
- Service name must be unique within the business.
- Price cannot be negative.

---

### Screen 7 — Team and responsibilities

**Customer-facing title:**

```txt
Who works in your business?
```

**Purpose:**

Prepare access and responsibilities.

**Fields:**

| Field | Required | Help |
|---|---|---|
| Add team member | Optional | Add people now or invite them later. |
| Name | Required if adding member | Used in tasks, reports, and attendance. |
| Phone or email | Optional | Needed if they will log in. |
| Responsibility | Required if adding member | Example: customer service, operations, delivery, finance. |
| Can approve important actions? | Optional | Controls who can approve discounts, payments, or changes. |

**Validation:**

- owner is always created automatically
- duplicate phone/email warning
- at least one owner required

**Can change later:** Yes

---

### Screen 8 — How work moves

**Customer-facing title:**

```txt
How does work move from start to finish?
```

**Purpose:**

Confirm the main operating flow in simple language.

**Example for Laundry Template:**

```txt
Receive order → Sort items → Clean → Finish/Iron → Check quality → Pack → Ready → Deliver
```

**Actions:**

- Use recommended steps
- Rename steps
- Remove steps
- Add step

**Required:** Yes

**Help message:**

```txt
These steps help your team know what is next and help you track delays. You can edit them later as your business changes.
```

**Validation:**

- at least two steps required
- step names must be unique
- start and finish must exist

**Internal mapping:**

- workflow definition
- task states
- operational screens

---

### Screen 9 — Money and receipts

**Customer-facing title:**

```txt
How do you collect money?
```

**Fields:**

| Field | Required | Help |
|---|---|---|
| Main currency | Yes | Used in prices, receipts, and reports. |
| Payment methods | Yes | Example: cash, card, bank transfer, InstaPay. |
| Do you apply tax? | Optional | Helps calculate receipts correctly. |
| Receipt starting number | Optional | Used to number receipts and documents. |
| Who can approve discounts/refunds? | Optional | Helps protect your money. |

**Validation:**

- currency required
- at least one payment method required
- tax percentage must be between 0 and 100
- receipt number must be positive

**Can change later:** Yes, with caution for numbering/accounting.

---

### Screen 10 — Customer messages

**Customer-facing title:**

```txt
How should customers hear from you?
```

**Fields:**

| Field | Required | Help |
|---|---|---|
| WhatsApp messages | Optional | Send order updates and reminders. |
| Email messages | Optional | Useful for receipts and business customers. |
| Message language | Optional | Choose the language customers usually prefer. |
| Business phone | Optional | Appears in customer messages. |

**Validation:**

- phone format warning by country
- at least one communication channel recommended, not required

---

### Screen 11 — Review

**Customer-facing title:**

```txt
Review your business setup
```

**Purpose:**

Let the owner confirm before generation.

**Sections:**

- Business identity
- Locations
- Services/work types
- Team responsibilities
- Work steps
- Money and receipts
- Customer messages

**Actions:**

- Edit section
- Save and continue later
- Build my business

**Help message:**

```txt
After this step, MJRH will prepare your workspace. You can still adjust most settings later.
```

---

### Screen 12 — Build my business

**Customer-facing title:**

```txt
We are preparing your business
```

**Purpose:**

Show progress while the Platform Generator runs.

**Progress messages:**

- Creating your workspace
- Preparing your locations
- Preparing your team areas
- Preparing your work steps
- Preparing receipts and numbers
- Preparing reports
- Final checks

Avoid showing technical database/function details.

**Failure behavior:**

If something fails:

```txt
We could not finish setup. Your answers are saved. Please try again or contact support.
```

Do not expose raw technical errors to the owner.

---

### Screen 13 — Ready

**Customer-facing title:**

```txt
Your business is ready
```

**Actions:**

- Open dashboard
- Add first customer
- Create first order/work item
- Invite team member
- Finish service catalog

**Help message:**

```txt
You can start now. We will guide you through the first real operation.
```

---

## 5. Progress Flow

Recommended progress model:

```txt
Step 1: Choose your business
Step 2: Basic details
Step 3: Locations
Step 4: Services
Step 5: Team
Step 6: Work steps
Step 7: Money
Step 8: Messages
Step 9: Review
Step 10: Ready
```

The UI may internally group these into fewer pages on mobile.

---

## 6. Required vs Optional Information

### Required to start

- business type
- business name
- country
- main language
- at least one location
- main currency
- at least one payment method
- selected or confirmed work steps

### Recommended but can be completed later

- full service catalog
- prices
- team members
- tax details
- approval rules
- document numbering preferences
- customer messaging details
- branding

### Optional

- logo
- public URL
- secondary languages
- detailed branch addresses
- advanced reports

---

## 7. Validation Rules

| Area | Rule |
|---|---|
| Business name | Required, 2–80 characters |
| Business type | Required |
| Country | Required |
| Language | Required |
| Branch/location | At least one required |
| Branch names | No duplicates |
| Currency | Required |
| Payment methods | At least one required |
| Tax rate | Optional, must be 0–100 if entered |
| Service price | Optional, cannot be negative |
| Work steps | At least start and finish, no duplicate names |
| Team member | Name required only when adding a member |
| Phone/email | Warn on duplicate, do not always block |
| Receipt number | Optional, must be positive if entered |

---

## 8. Help Message Pattern

Every screen should include three small explanations:

```txt
Why we ask this
How it affects your business
Can I change it later?
```

Example:

```txt
Why we ask this:
Your locations help us organize orders, staff, deliveries, and reports.

How it affects your business:
Each location can have its own team, orders, and money reports.

Can I change it later?
Yes. You can add or edit locations later.
```

---

## 9. Internal Engineering Mapping

The product should use simple language, while engineering maps answers to platform concepts.

| Customer concept | Internal concept |
|---|---|
| Business | Organization / tenant |
| Location | Branch |
| Team responsibility | Role / actor permissions |
| Work steps | Workflow states / task engine |
| Services or work types | Service catalog / forms |
| Receipts and numbers | Document engine / numbering |
| Money collection | Finance engine / payment methods |
| Who can approve | Permission engine / approval rules |
| Customer messages | Notification engine |
| Review and build | Platform Generator execution |

This mapping must stay internal.

---

## 10. First Success Experience

Immediately after Business Initialization, the owner must feel that a real company has been created.

The first minute inside the platform is part of the product.

The first dashboard should:

- say clearly that the business is ready
- show what MJRH prepared
- avoid empty-state confusion
- recommend one next best action
- guide the owner toward the first real customer or first work item
- allow sample data exploration if the owner is not ready

Recommended first dashboard message:

```txt
Your business is ready. We prepared your workspace, services, work steps, receipts, reports, and customer messages.
```

Recommended next action:

```txt
Create your first customer
```

Secondary actions:

- Review your services
- Invite your team
- Create first order/work item
- Explore with sample data

---

## 11. Recommendation

Do not implement this immediately.

Next step should be review and approval of:

1. screen sequence
2. language rules
3. required/optional fields
4. template selection approach
5. generation process
6. failure/retry behavior

Only after approval should implementation begin.
