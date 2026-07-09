# MJRH Staging Environment Setup Guide

## Overview

A staging environment mirrors production but uses a separate Supabase project and Vercel deployment. This allows safe testing of migrations, features, and integrations before deploying to production.

## Step 1: Create Staging Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Create a new project named `mjrh-staging`
3. Choose the same region as production (Frankfurt)
4. Copy the project URL and anon key

## Step 2: Apply All Migrations

```bash
# Link to staging project
npx supabase link --project-ref YOUR_STAGING_PROJECT_REF

# Push all migrations
npx supabase db push --include-all
```

## Step 3: Configure Vercel Preview Deployment

Vercel automatically creates preview deployments for every branch/PR. To use staging Supabase:

1. Go to Vercel → Project → Settings → Environment Variables
2. Add **Preview** environment variables:
   - `VITE_SUPABASE_URL` = your staging URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = your staging anon key
3. Keep **Production** environment variables pointing to production Supabase

## Step 4: Seed Staging Data

```bash
# Set staging credentials
export SUPABASE_URL="https://YOUR_STAGING_REF.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_STAGING_SERVICE_KEY"

# Create a test tenant via the signup page or admin-actions
# Then seed demo data:
DEMO_TENANT_ID="your-staging-tenant-id" node scripts/seed-demo-data.mjs
```

## Step 5: Verify Staging Health

```bash
# Check all tables exist
VITE_SUPABASE_URL="https://YOUR_STAGING_REF.supabase.co" \
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_STAGING_ANON_KEY" \
node scripts/verify-backup.mjs
```

## Step 6: Test Before Production

Before pushing to production:

1. ✅ Run full CI locally:
   ```bash
   npm run typecheck && npm run test:run && npm run build && npm run bundle:check
   ```

2. ✅ Test on staging preview URL:
   - Login flow
   - Create order
   - Station workflow
   - Cash closing
   - Customer portal

3. ✅ Verify migrations apply cleanly:
   ```bash
   npx supabase db push --dry-run
   ```

4. ✅ Push to production:
   ```bash
   git push origin main
   ```

## Environment Variable Summary

| Variable | Production | Staging |
|---|---|---|
| `VITE_SUPABASE_URL` | `dngjfjrjddigqadlyain.supabase.co` | Your staging URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production anon key | Staging anon key |
| `SUPABASE_ACCESS_TOKEN` | CI secret | CI secret (same) |
| `E2E_AUTH_EMAIL` | CI secret | CI secret (staging user) |
| `E2E_AUTH_PASSWORD` | CI secret | CI secret (staging password) |

## Important Notes

- **Never test on production data.** Always use staging for new features.
- **Migrations must be backward-compatible.** Test on staging first.
- **Token hygiene:** Rotate any tokens used during staging setup.
- **Cost:** Supabase Free tier supports 2 projects. Staging can use the free tier.
