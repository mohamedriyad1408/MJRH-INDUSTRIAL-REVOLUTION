# Dry Tech Restoration Plan

**Status:** Planning deliverable — no restoration execution yet  
**Branch:** `feature/mjrh-v3-core-platform`  
**Objective:** Restore `Dry Tech` as the Official Gold Standard Organization  
**Target slug:** `dry-tech`  
**Temporary generated reference slug:** `dry-tech-reference`

---

## 1. Mission

Dry Tech must become the **Official Gold Standard Organization**.

This is stronger than being a reference organization.

Every new platform capability must be validated against Dry Tech before approval.

Dry Tech must be suitable for:

- customer demonstrations
- training
- QA
- documentation
- videos
- pilot deployment
- future customer onboarding
- platform capability validation
- regression checks before approval

Dry Tech must never become a development environment.

---

## 2. Current State Snapshot

A production inspection was performed for the two current Dry Tech-related organizations.

### 2.1 Existing official Dry Tech

```txt
name: Dry Tech
slug: dry-tech
business_type: laundry
```

Current counts:

| Area | Count |
|---|---:|
| Branches | 2 |
| Core Departments | 0 |
| Employees | 12 |
| Customers | 8 |
| Services | 205 |
| Orders | 530 |
| Work Orders | 0 |
| Journal Entries | 612 |
| Core Workflows | 0 |
| Onboarding Completed | false |
| Can Enter Platform | false |

Interpretation:

- `dry-tech` appears to contain the richer pre-transition business data.
- It is blocked by the new Platform Generator access gate because Core setup/onboarding is incomplete.
- It should be restored in place if possible, not deleted.

### 2.2 Generated Dry Tech reference

```txt
name: Dry Tech
slug: dry-tech-reference
business_type: Reference Laundry Operations
```

Current counts:

| Area | Count |
|---|---:|
| Branches | 3 |
| Core Departments | 10 |
| Employees | 9 |
| Customers | 8 |
| Services | 10 |
| Orders | 12 |
| Work Orders | 0 |
| Journal Entries | 12 |
| Core Workflows | 1 |
| Onboarding Completed | true |
| Can Enter Platform | true |

Interpretation:

- `dry-tech-reference` proves the generator path works.
- It is not the full historical reference business.
- It should be treated as a temporary reference-generator proof, not the official training/demo organization.

---

## 3. Recommended Restoration Strategy

Recommended strategy: **restore `dry-tech` in place**.

Do not replace it with `dry-tech-reference`.

Reason:

- `dry-tech` already contains the representative operational history: 530 orders and 612 journal entries.
- Deleting it would risk losing the latest fully operational business state.
- The new failure is mainly platform initialization metadata, not absence of business data.

The restoration should add the missing Platform Generator compatibility layer around the existing business data.

---

## 4. Restoration Principles

1. No manual table duplication.
2. No direct copy from `dry-tech-reference` into `dry-tech`.
3. No development or experiments inside Dry Tech.
4. Preserve existing Dry Tech IDs and historical records where possible.
5. Use the Laundry Template and Platform Generator functions to generate missing configuration.
6. Run every restoration command first in dry-run mode.
7. Create a database backup/snapshot before applying changes.
8. Record every restoration action in an audit/event log.
9. Treat Dry Tech as the approval benchmark for new platform capabilities.
10. Long-term, Dry Tech must be reproducible through: Template → Platform Generator → Demo Data Import.

---

## 5. Proposed Restoration Flow

### Step 1 — Freeze Dry Tech

Temporarily restrict non-essential changes to `dry-tech` during restoration.

Purpose:

- prevent demo data drift during repair
- avoid partial state while restoring setup compatibility

### Step 2 — Create backup checkpoint

Create a recoverable checkpoint before any mutation.

Recommended backup assets:

- tenant metadata
- branches
- employees
- customers
- service catalog
- orders
- order items
- service units
- pickups
- accounting/journal data
- workflow-related records
- operational events

This backup is for disaster recovery only. It must not become the restoration mechanism.

### Step 3 — Verify Laundry Template readiness

Confirm `core_template_registry.slug = 'laundry'` is active and has required assets:

- departments
- roles
- workflows
- services
- financial event types
- reports

If the Laundry Template is incomplete, fix the template first.

### Step 4 — Generate missing Core configuration for `dry-tech`

Run the Platform Generator against the existing tenant ID.

The generator should create/update:

- `core_setup_profiles`
- `tenant_onboarding`
- `core_departments`
- `core_navigation_items`
- `core_roles`
- `core_workflow_blueprints`
- `core_financial_event_types`
- `core_documents`
- `core_forms`
- reference metadata in `tenants.industry_profile`

Important:

- Existing business data must not be deleted.
- Existing service catalog must not be replaced without explicit approval.
- Existing order history must remain unchanged.

### Step 5 — Validate access gate

Confirm:

```sql
select public.can_enter_platform(<dry_tech_tenant_id>);
```

Expected result:

```txt
true
```

### Step 6 — Validate operational completeness

Minimum checks:

- owner can log in
- sidebar opens correctly
- dashboard loads
- orders list loads
- order details load
- customer list loads
- services list loads
- accounting views load
- reports load
- station/workflow screens do not break

### Step 7 — Mark Dry Tech as official reference organization

Set metadata:

```json
{
  "reference_organization": true,
  "development_environment": false,
  "generated_from_template": "laundry",
  "restored_from_pre_platform_generator_state": true
}
```

### Step 8 — Define lifecycle controls

Dry Tech may be used only for:

- demonstrations
- training
- QA
- documentation
- videos
- pilot onboarding

Dry Tech must not be used for:

- development
- experiments
- migrations testing
- destructive trials
- prototype data

---

## 6. Data Recovery Scope

Dry Tech restoration must preserve or restore:

- Branches
- Departments
- Employees
- Customers
- Services
- Work Orders / operational tasks where present
- Operational history
- Financial configuration
- Accounting data
- Reports
- Dashboards
- Sample production records

Current finding:

- `dry-tech` has strong historical data for orders and accounting.
- `dry-tech` lacks new Core setup metadata.

Therefore the restoration should primarily repair Core Platform initialization state around existing data.

---

## 7. Proposed Restoration Script

Create a dedicated script after approval:

```txt
scripts/restore-dry-tech-reference.mjs
```

Required behavior:

- dry-run by default
- apply only with `DRY_TECH_RESTORE_APPLY=1`
- refuse to run if target slug is not `dry-tech`
- refuse to delete the tenant
- preserve historical orders and accounting data
- apply `complete_mjrh_core_setup()` to the existing tenant
- add missing template-generated configuration only
- output a validation summary

---

## 8. Gold Standard Validation Policy

After restoration, every new platform capability must pass validation against Dry Tech before approval.

Validation should answer:

1. Does this capability work inside a realistic business with historical data?
2. Does it preserve orders, customers, services, accounting, and reports?
3. Does it improve the Core Platform rather than only one demo case?
4. Does it avoid turning Dry Tech into a development environment?
5. Can the same capability be generated or enabled through templates/configuration?

Approval rule:

```txt
No platform capability is approved until it works safely in Dry Tech.
```

Dry Tech is a gold standard benchmark, not a sandbox.

---

## 9. Long-Term Reproducibility Target

Dry Tech must never become manually maintained.

The long-term target is:

```txt
Laundry Template
↓
Platform Generator
↓
Demo Data Import
↓
Dry Tech Gold Standard Organization
```

Deleting and recreating Dry Tech should become a routine validation process.

This requires:

- complete Laundry Template assets
- declarative demo data import packs
- repeatable generation scripts
- checksums/versioning
- automated validation reports

---

## 10. Risks

### Risk 1 — Legacy data does not fully match new Core assumptions

Mitigation:

- run read-only diagnostics before mutation
- add compatibility mapping instead of destructive changes

### Risk 2 — Existing service catalog is larger than the current Laundry Template

Current `dry-tech` has 205 services, while the active Laundry Template has 10 service assets.

Mitigation:

- do not overwrite current services
- later extract a curated template catalog from Dry Tech if approved

### Risk 3 — Accounting views may depend on older order/event assumptions

Mitigation:

- run finance/report smoke tests after restoration
- do not regenerate journal entries unless explicitly required

### Risk 4 — Demo users may continue changing Dry Tech

Mitigation:

- define access policy
- create periodic reset or snapshot procedure
- create separate development organizations for experiments

---

## 9. Recommendation

Proceed with a controlled restoration of `dry-tech` in place.

Do not delete `dry-tech`.

Do not use `dry-tech-reference` as the official demo organization.

Use `dry-tech-reference` only as proof that generation works and as a temporary comparison environment.

Implementation should begin only after review and approval of this plan.
