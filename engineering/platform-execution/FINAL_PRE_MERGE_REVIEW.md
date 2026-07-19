# Final Pre-Merge Review — Platform Foundation

**Status:** Final review before PR / CTO approval  
**Branch:** `feature/mjrh-v3-core-platform`  
**Scope:** Database design, PostgreSQL security, CI/smoke validation  
**Merge:** Do **not** merge yet; open PR after CTO approval.

---

## 1. Database Design Review

### 1.1 Tables reviewed

- `core_navigation_assets`
- `core_permission_assets`
- `core_permission_bindings`
- `core_capability_registry`
- `core_capability_dependencies`
- `core_template_capabilities`
- `core_organization_capabilities`
- `core_asset_type_registry`
- `core_capability_asset_definitions`
- `core_organization_asset_installs`

### 1.2 Index / FK / RLS result

All new tables have primary keys.

Tenant runtime tables have tenant indexes and tenant FKs where applicable:

- `core_permission_bindings.tenant_id → tenants.id`
- `core_organization_capabilities.tenant_id → tenants.id`
- `core_organization_asset_installs.tenant_id → tenants.id`

Asset and capability relationship tables have FKs:

- `core_capability_dependencies.capability_key → core_capability_registry.capability_key`
- `core_template_capabilities.template_slug → core_template_registry.slug`
- `core_template_capabilities.capability_key → core_capability_registry.capability_key`
- `core_capability_asset_definitions.capability_key → core_capability_registry.capability_key`
- `core_capability_asset_definitions.asset_type → core_asset_type_registry.asset_type`
- `core_organization_asset_installs.asset_definition_id → core_capability_asset_definitions.id`
- `core_organization_asset_installs.asset_type → core_asset_type_registry.asset_type`
- `core_organization_asset_installs.capability_key → core_capability_registry.capability_key`

RLS is enabled on all reviewed tables.

### 1.3 Orphan / dependency validation

Current validation returned:

```json
{
  "nav_assets_orphan_capability": 0,
  "permission_assets_orphan_capability": 0,
  "asset_definitions_orphan_capability": 0,
  "org_capabilities_orphan_capability": 0,
  "nav_items_orphan_source_asset": 0,
  "permission_bindings_orphan_asset": 0
}
```

Circular dependency validation:

```json
{
  "cycle_count": 0,
  "circular_dependency_paths": []
}
```

### 1.4 Database design verdict

**PASS** for current merge preparation.

Non-blocking future improvement:

- Add semantic version compatibility constraints for capability dependencies when versioned upgrades begin.
- Add partial indexes later if query volume grows around `status = enabled` and capability filtering.

---

## 2. PostgreSQL Security Review

### 2.1 RLS review

RLS is enabled for new source and runtime tables.

Runtime organization-owned tables use tenant access policies:

- `core_permission_bindings_tenant_all`
- `core_organization_capabilities_tenant_all`
- `core_organization_asset_installs_tenant_all`

Source registries are read-only to authenticated users via policies and are intended to be mutated only through migrations or governed admin tooling.

### 2.2 SECURITY DEFINER review

Reviewed functions include:

- `apply_navigation_assets_for_tenant`
- `apply_permission_assets_for_tenant`
- `actor_has_permission`
- `current_actor_has_permission`
- `get_actor_permissions`
- `apply_capabilities_for_tenant`
- `validate_capability_dependencies`
- `build_capability_manifest`
- `refresh_capability_manifest`
- `refresh_all_capability_manifests`
- `validate_capability_manifest`
- `refresh_generic_capability_asset_definitions`
- `apply_capability_assets_for_tenant`

All reviewed SECURITY DEFINER functions set:

```txt
search_path = public
```

Tenant-mutating functions check tenant access using `can_access_tenant` before modifying organization-owned runtime state.

### 2.3 Security finding

**Finding:** global refresh functions are SECURITY DEFINER and currently executable by authenticated users:

- `refresh_capability_manifest`
- `refresh_all_capability_manifests`
- `refresh_generic_capability_asset_definitions`

Impact:

- These functions refresh platform metadata derived from existing source tables.
- They do not directly expose customer data.
- They can write global manifest/asset-definition metadata.

Risk level:

```txt
Medium governance risk, low immediate data risk
```

Recommendation before or shortly after merge:

- Restrict direct execution of global refresh functions to service/admin role or super-admin-only RPC wrapper.
- Keep tenant-level install functions available to authenticated users with tenant access.

### 2.4 Security verdict

**PASS WITH RECOMMENDATION.**

Not a data-loss blocker, but should be added to the security hardening backlog before public marketplace/admin tooling is exposed.

---

## 3. CI and Smoke Validation Review

### 3.1 Commands executed

Typecheck:

```bash
npm run typecheck -- --pretty false
```

Result:

```txt
PASS
```

Unit tests:

```bash
npm run test:run
```

Result:

```txt
9 test files passed / 36 tests passed
```

Build:

```bash
npm run build
```

Result:

```txt
PASS
```

Note: Vite emitted bundle-size warnings only; not a merge blocker.

New tenant readiness rollback check:

```bash
SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=dngjfjrjddigqadlyain npm run verify:new-tenant
```

Result:

```txt
New tenant readiness verification passed via rollback tenant slug: ci-readiness-1783896575451-9ce197
```

### 3.2 Platform Foundation smoke validation

A transaction-rollback fresh organization validation was executed and confirmed:

- tenant created
- can enter platform
- 10 capabilities installed
- 96 asset installs
- 57 navigation items / 47 source-owned nav items on fresh generation path
- 145 permission bindings
- no Dry Tech leakage

Dry Tech validation confirmed:

- `/dry-tech` remains active
- `can_enter_platform = true`
- 10 installed capabilities
- 96 asset installs
- 57 navigation items
- 145 permission bindings
- historical counts preserved

### 3.3 CI workflow review

Existing CI workflow includes:

- repository guard
- security audit
- typecheck
- unit tests
- Playwright browser E2E
- new tenant readiness verification
- production build
- bundle budget

### 3.4 CI gap

Current CI has new tenant readiness smoke coverage, but does not yet include an explicit **Dry Tech Gold Standard smoke test**.

Recommendation:

- Add a future CI job or script:

```txt
validate:dry-tech-gold
```

It should check:

- Dry Tech can enter platform
- counts remain above expected minimums
- capabilities installed
- asset pipeline installed
- navigation and permissions present
- no relationship breaks

### 3.5 CI verdict

**PASS WITH RECOMMENDATION.**

The branch is validated enough for PR review, but Dry Tech Gold Standard smoke should be added as a follow-up guardrail.

---

## 4. Final Pre-Merge Recommendation

Overall verdict:

```txt
PASS — Ready to open PR for CTO review.
```

Conditions before merge decision:

1. Attach `PLATFORM_FOUNDATION_RELEASE_REPORT.md`.
2. Attach this `FINAL_PRE_MERGE_REVIEW.md`.
3. CTO confirms the SECURITY DEFINER recommendation is acceptable as follow-up or requests pre-merge hardening.
4. CI passes on the PR.
5. No direct push to main.

Recommended path:

```txt
PR
↓
CTO Approval
↓
Merge to main
↓
Sprint 2 — Work Order + Task Bridge
```

No additional foundation layer is recommended before Sprint 2.

---

## 5. Follow-Up Backlog Items

These are not blockers unless CTO decides otherwise:

1. Restrict global manifest refresh functions to admin/service context.
2. Add `validate:dry-tech-gold` smoke script/job.
3. Add semantic version validation for capability dependencies.
4. Continue route/action permission enforcement adoption.
5. Replace legacy bootstrap with fully template-aware generation in a dedicated sprint.
