# Dry Tech Reference Organization Report

**Branch:** `feature/mjrh-v3-core-platform`  
**Organization name:** Dry Tech  
**Slug:** `dry-tech-reference`  
**Purpose:** Official reference implementation for Laundry operations  
**Status:** Generated from Laundry Template through the Platform Generator path

> Dry Tech is not a backup of the old Laundry project. Dry Tech is the first proof that MJRH can generate a real operational organization automatically.

---

## 1. Laundry Template Status

Laundry Template has been finalized as an active `industry_package` inside the Template Registry.

Database registry:

- `core_template_registry.slug = 'laundry'`
- `category = 'industry_package'`
- `status = 'active'`
- `metadata.generated_only = true`
- `metadata.reference_organization = 'Dry Tech'`

Template assets currently registered:

| Asset Type | Count | Notes |
|---|---:|---|
| Departments | 10 | Template-owned operational departments/stations |
| Roles | 7 | Template-owned role definitions and approval levels |
| Workflows | 1 | Laundry order lifecycle as template asset |
| Services | 10 | Laundry service catalog generated from template assets |
| Financial Events | 6 | Generic finance events only: Transaction, Adjustment, Allocation, Settlement, Approval, Transfer |
| Reports | 3 | Daily operations, financial summary, quality exceptions |

Important architectural point:

- Laundry assets live in `core_template_assets`.
- They are not Core Platform defaults.
- The Core Platform still owns only generic capabilities.

---

## 2. Dry Tech Generation Process

Dry Tech was generated using the repeatable script:

```bash
REFERENCE_APPLY=1 REFERENCE_RESET=1 npm run reference:dry-tech
```

Equivalent direct command:

```bash
REFERENCE_APPLY=1 REFERENCE_RESET=1 \
SUPABASE_ACCESS_TOKEN=... \
SUPABASE_PROJECT_REF=dngjfjrjddigqadlyain \
node scripts/generate-reference-dry-tech.mjs
```

Generation steps performed by the script:

1. Validate that the Laundry Template is active.
2. Refuse to overwrite any non-reference organization using the target slug.
3. If `REFERENCE_RESET=1`, delete only the existing generated Dry Tech reference organization.
4. Create a clean organization shell named `Dry Tech`.
5. Mark it as:
   - `reference_organization = true`
   - `development_environment = false`
   - `generated_from_template = laundry`
6. Apply the Laundry Template via `complete_mjrh_core_setup()`.
7. Generate branches, departments, roles, workflows, financial events, setup profile, onboarding completion, and platform access gate.
8. Generate accounting foundations:
   - default cash account
   - default chart of accounts
9. Generate template service catalog from `core_template_assets`.
10. Populate representative production-like data:
    - employees
    - customers
    - services
    - orders
    - order items
    - service units
    - pickup requests
    - documents
    - forms
    - operation event audit record

The script performs a dry-run by default using a transaction rollback. It only writes when `REFERENCE_APPLY=1` is provided.

---

## 3. Generated Dry Tech Snapshot

Latest generation result:

| Item | Count |
|---|---:|
| Branches | 3 |
| Departments | 10 |
| Core Roles | 7 |
| Employees | 9 |
| Customers | 8 |
| Services | 10 |
| Workflows | 1 |
| Financial Event Types | 6 |
| Orders | 12 |
| Pickup Requests | 2 |
| Platform access | Enabled |

Generated organization:

```txt
Name: Dry Tech
Slug: dry-tech-reference
Template: laundry
Business Type: Reference Laundry Operations
```

---

## 4. Remaining Manual Steps

No manual database duplication is required.

No table copy was used.

Current manual/operator steps are limited to running the generator command with production credentials:

```bash
REFERENCE_APPLY=1 REFERENCE_RESET=1 npm run reference:dry-tech
```

Optional operational steps:

1. Assign a dedicated demo owner user via:
   ```bash
   DRY_TECH_OWNER_USER_ID=<uuid>
   ```
2. Point a public/demo domain to `/dry-tech-reference` if needed.
3. Capture screenshots and videos from the generated organization.
4. Confirm who has access before customer-facing demos.

---

## 5. Required Improvements Before Templates Become Production-Ready

The Dry Tech generation succeeded, but the following improvements are recommended before declaring templates production-grade:

### 5.1 Retire legacy tenant bootstrap behavior for template-generated organizations

Current database still has legacy tenant insert bootstrap behavior that can create old default entities when a tenant row is inserted.

The Dry Tech generator compensates by removing legacy service defaults and using the Laundry Template catalog.

Recommended improvement:

- Introduce a first-class `create_organization_from_template()` database function.
- Make tenant creation template-aware from the beginning.
- Skip all legacy bootstrap paths when `industry_profile.generated_from_template` is present.

### 5.2 Move demo seed data into Template Assets

Employees, customers, and operational example orders are currently generated by the reference script.

Recommended improvement:

- Add supported asset types or seed packs for:
  - demo employees
  - demo customers
  - demo orders
  - demo pickup requests
  - demo documents
- Let the Platform Generator consume seed packs declaratively.

### 5.3 Add template versioning and reproducibility checks

Recommended improvement:

- Add `template_version` to every generated organization.
- Store a generation checksum.
- Add a verification script that compares Dry Tech against the Laundry Template.

### 5.4 Add template QA tests

Recommended improvement:

- A CI job should generate Dry Tech in a transaction and assert minimum counts.
- The test should fail if a template cannot generate a usable organization.

### 5.5 Define Reference Organization lifecycle policy

Recommended policy:

- Dry Tech is stable reference data.
- Dry Tech is not a development environment.
- Dry Tech can be deleted and regenerated only through the official generator.
- Experimental development must happen in separate development organizations.

---

## 6. Success Criteria Validation

Success criterion:

> Deleting Dry Tech and regenerating it from the Laundry Template produces an identical operational environment with minimal manual work.

Current status:

- Dry Tech can be regenerated with one command.
- The generator refuses unsafe overwrites.
- The generated organization is marked as reference-only.
- The platform access gate is completed automatically.
- Representative operational data is generated automatically.

Conclusion:

Dry Tech now validates the direction of the Platform Generator, while also exposing the next hardening target: removing the remaining legacy tenant bootstrap behavior and moving all reference seed data into declarative template assets.
