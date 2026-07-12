# Navigation Asset Validation Report

**Sprint:** Sprint 1 — Capability Asset Foundation  
**Branch:** `feature/mjrh-v3-core-platform`  
**Scope:** Capability-driven navigation assets and generated organization navigation

---

## 1. Dry Tech Validation

Target organization:

```txt
Dry Tech
slug: dry-tech
```

Navigation generation executed through:

```sql
public.apply_navigation_assets_for_tenant(<dry-tech-tenant-id>, 'laundry')
```

Result:

```json
{
  "inserted": 47,
  "updated": 0,
  "template_slug": "laundry",
  "total_navigation_items": 57
}
```

The 57 records include:

- 47 new source-owned Navigation Asset records
- 10 older compatibility navigation records from the previous Core initialization

Runtime rendering now de-duplicates by route and prefers source-owned Navigation Asset records over older compatibility records.

### Source ownership breakdown

| Source Ownership | Count |
|---|---:|
| CORE | 5 |
| CAPABILITY | 32 |
| TEMPLATE | 10 |
| Compatibility / older generated records | 10 |

### Historical data preservation

| Area | Before | After |
|---|---:|---:|
| Branches | 2 | 2 |
| Employees | 12 | 12 |
| Customers | 8 | 8 |
| Services | 205 | 205 |
| Orders | 530 | 530 |
| Order Items | 1103 | 1103 |
| Service Units | 1647 | 1647 |
| Journal Entries | 612 | 612 |

Validation:

```txt
historical_counts_preserved = true
```

Relationship checks:

| Check | Result |
|---|---:|
| Orders missing customer | 0 |
| Order items missing order | 0 |
| Service units missing order | 0 |

---

## 2. Disposable Organization Validation

A disposable organization was created inside a transaction rollback to verify that the mechanism is not Dry Tech-specific.

Result:

```json
{
  "tenant_created": true,
  "can_enter_platform": true,
  "nav_total": 47,
  "core_nav": 5,
  "capability_nav": 32,
  "template_nav": 10,
  "dry_tech_leak": false
}
```

Validation:

- New organization received navigation through the same mechanism.
- Navigation included Core, Capability, and Template-owned assets.
- No Dry Tech-specific label or route leaked into the generated organization.
- Transaction was rolled back; no disposable tenant remains.

---

## 3. Architecture Compliance

| Requirement | Status |
|---|---|
| Core understands navigation generically | PASS |
| Capability Packs can own navigation assets | PASS |
| Templates can own template-specific navigation assets | PASS |
| Generated Organizations receive runtime navigation | PASS |
| Dry Tech navigation generated from configuration | PASS |
| Historical Dry Tech data untouched | PASS |
| No hardcoded Dry Tech logic in Core | PASS |
| New org can receive same mechanism | PASS |
| Typecheck passes | PASS |

---

## 4. Notes

The old static sidebar remains as fallback/compatibility and has not been deleted or refactored away.

The new implementation introduces a governed asset path:

```txt
CORE / CAPABILITY / TEMPLATE Navigation Assets
↓
ORGANIZATION Runtime Navigation Items
↓
AppSidebar rendering from generated records
```

This is the first practical step toward capability-driven Platform Generator behavior.
