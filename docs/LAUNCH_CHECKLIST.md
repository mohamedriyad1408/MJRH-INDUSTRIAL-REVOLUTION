# MJRH Launch Checklist

Use this checklist before every commercial launch/demo.

## 1) Required GitHub/Vercel/Supabase secrets

Configure these as GitHub Actions secrets so CI can run the full release gate:

- `E2E_AUTH_EMAIL`
- `E2E_AUTH_PASSWORD`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`

Configure these as Vercel environment variables before removing `.env.production` from Git:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## 2) Release gate

Run locally before pushing:

```bash
npm run audit:ci
npm run typecheck
npm run test:run
npm run e2e
npm run verify:new-tenant
npm run build
npm run bundle:check
```

If authenticated credentials are available, also run:

```bash
E2E_AUTH_EMAIL="..." E2E_AUTH_PASSWORD="..." npm run e2e:auth:all
```

## 3) Live production smoke after deploy

```bash
PLAYWRIGHT_BASE_URL=https://mjrh.vercel.app npm run e2e:public
E2E_AUTH_EMAIL="..." E2E_AUTH_PASSWORD="..." PLAYWRIGHT_BASE_URL=https://mjrh.vercel.app npm run e2e:auth:all
E2E_AUTH_EMAIL="..." E2E_AUTH_PASSWORD="..." PLAYWRIGHT_BASE_URL=https://mjrh.vercel.app npm run prod:health
```

## 4) Language readiness gate

The automated tests now guard that:

- Arabic stays Arabic and RTL in protected app pages.
- The Arabic sidebar does not fall back to English.
- French protected navigation does not fall back to English.
- Critical commercial language labels do not silently render as English.

If a new page adds user-facing text, add the translation key to `lib/i18n-internal.ts` or the appropriate public pack and add/extend tests when the text is commercial-critical.

## 5) Product smoke path for sales demo

1. Open `/landing`.
2. Open `/dry-tech`.
3. Open `/customer-portal?tenant=dry-tech`.
4. Open a tracking link from an existing delivered order.
5. Log in as an owner/demo account.
6. Open:
   - `/system-health`
   - `/daily-operations`
   - `/live-map`
   - `/stations/reception`
   - `/stations/cleaning`
   - `/stations/ironing`
   - `/stations/packing`
   - `/stations/qc`
   - `/finance`
   - `/accounting`
   - `/reports`
7. Confirm no black screen and no unresolved client errors in System Health.

## 6) Operational launch rules

- Do not delete production data to repair a demo. Use forward repair migrations/functions.
- Every alert must either have a quick fix, open a repair page, or clearly require manual action.
- New features must satisfy `docs/FEATURE_PROPAGATION_CHECKLIST.md` so they work for all current tenants and every new tenant.
- WhatsApp remains manual via `wa.me` links unless a paid WhatsApp Business API account is configured.

## 7) Post-launch token hygiene

Rotate any GitHub/Supabase/Vercel tokens that were pasted into chat or used in an emergency push.
