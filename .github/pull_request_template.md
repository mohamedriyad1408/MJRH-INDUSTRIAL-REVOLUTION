# MJRH Pull Request Checklist

## What changed?

- [ ] UI only
- [ ] Database/migration
- [ ] Supabase Edge Function
- [ ] Accounting/cash flow
- [ ] Order workflow/stations
- [ ] Customer portal
- [ ] New tenant/bootstrap behavior

## Required checks

Run locally before merge:

```bash
npm run audit:ci
npm run typecheck
npm run test:run
npm run e2e
npm run verify:new-tenant
npm run build
```

## Feature propagation

- [ ] Works for existing tenants.
- [ ] Works for a new tenant created after this change.
- [ ] If new tables were added, RLS is enabled.
- [ ] If new workflow exists, APDO event is recorded.
- [ ] If cash/payment/accounting is affected, journal and cash transaction behavior is verified.
- [ ] If worker queues are affected, delivered/cancelled records are excluded.
- [ ] If customer communication is affected, WhatsApp outbox behavior is documented.

## Security

- [ ] No service role keys or tokens committed.
- [ ] No new unguarded SECURITY DEFINER functions.
- [ ] User-facing error messages do not expose secrets.
- [ ] Client error logging sanitizes sensitive values.

## Evidence

Paste test/build output or link to CI run:

```txt
...
```
