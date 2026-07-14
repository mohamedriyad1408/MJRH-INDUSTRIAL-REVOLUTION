# Feature Propagation Checklist

Any feature added to MJRH must work for **all tenants**, including tenants created in the future.

Before merging any feature, confirm:

## Database

- [ ] New tables have `tenant_id` where needed.
- [ ] New tables have RLS enabled.
- [ ] RLS policies use `can_access_tenant` and branch-aware logic where applicable.
- [ ] New workflow events call `record_operation_event` for APDO.
- [ ] New financial flows create cash transactions and journal entries where applicable.

## New tenant readiness

- [ ] `seed_tenant_defaults` creates or enables required defaults.
- [ ] `tenant_bootstrap_health` reflects any new readiness requirement.
- [ ] Required `tenant_features` flags are inserted for new tenants.
- [ ] `scripts/verify-new-tenant-readiness.mjs` still passes.

## UI

- [ ] Feature works for owner.
- [ ] Feature works for manager roles if applicable.
- [ ] Feature does not leak delivered/cancelled work into worker queues.
- [ ] Mobile and desktop smoke flows still pass.

## Tests

Run:

```bash
npm run audit:ci
npm run typecheck
npm run test:run
npm run e2e
npm run verify:new-tenant
npm run build
```

## Rule

If a feature only works for the current tenant but not a newly bootstrapped tenant, it is not complete.
