# Prioritized Recovery Roadmap

## Phase 0 — Manual Smoke Verification

1. Login Dry Tech owner.
2. Open Dry Tech sidebar.
3. Open Orders list/detail/new order.
4. Open Customers and Services.
5. Open Accounting and Reports.
6. Open station screens.
7. Open Super Admin dashboard/tenants/users.

## Phase 1 — Critical UI Restore

Fix only P0 UI/runtime issues found in smoke tests. No platform redesign.

## Phase 2 — Super Admin Restore

Fix admin pages that block tenant/user management.

## Phase 3 — Stable Baseline Tag

After Dry Tech + Super Admin pass smoke, create stable tag/branch.

## Phase 4 — Reintroduce Platform Layers Gradually

Only after baseline is trusted, reintroduce foundation pieces in small PRs with browser validation.

## Expected Stable Baseline Definition

A stable baseline means:

- Dry Tech owner can log in.
- Dry Tech core operations work.
- Super Admin can manage organizations/users.
- CI passes.
- Production deploy points to same tested code.
- No hidden DB mutation breaks legacy runtime.
