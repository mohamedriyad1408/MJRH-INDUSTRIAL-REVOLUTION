# MJRH Deployment Runbook

## Release rule

Do not deploy unless this passes:

```bash
npm run audit:ci
npm run typecheck
npm run test:run
npm run e2e
npm run verify:new-tenant
npm run build
```

## Supabase migrations

1. Test migration in a transaction when possible:

```sql
BEGIN;
-- migration SQL
ROLLBACK;
```

2. Apply migration through Supabase CLI/API.
3. Confirm `supabase_migrations.schema_migrations` has the same version as the file name.
4. Run:

```bash
npm run verify:new-tenant
```

## Edge Functions

Deploy only changed functions:

```bash
npx supabase functions deploy <function-name> --project-ref <ref> --use-api
```

Required secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OCR_SPACE_API_KEY` if OCR is enabled

## Vercel

Required environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`

Current repository still contains `.env.production` to keep Vercel stable. The safer target state is to move these values to Vercel environment variables and remove `.env.production` from Git.

## Production smoke test

After deploy:

```bash
PLAYWRIGHT_BASE_URL=https://mjrh.vercel.app npm run e2e
```

## Rollback

- Frontend: rollback to previous Vercel deployment or revert commit.
- Database: prefer forward repair migration. Avoid destructive rollback on production data unless reviewed.
- Edge Function: redeploy previous known-good function source.

## Post-release checks

- Open `/login`.
- Open `/customer-portal?tenant=dry-tech`.
- Open `/dry-tech`.
- Log in and open `/system-health`.
- Confirm no new `client_error_logs` after deployment.
