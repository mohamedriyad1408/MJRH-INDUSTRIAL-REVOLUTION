# MJRH Commercial Readiness

This document tracks the work needed to keep MJRH production-grade.

## Completed foundations

- Multi-tenant laundry operations model.
- Branch-aware RLS and reporting.
- Customer portal and public tracking.
- Full order lifecycle across reception, cleaning, drying/assembly, ironing, packing, QC, delivery.
- Attendance-aware ironing distribution.
- Customer returns after delivery without reopening delivered orders.
- InstaPay proof storage as financial documents.
- Double-entry accounting flows for orders, expenses, payroll, tips, and cash movements.
- APDO operational event matrix and repair tools.
- New tenant bootstrap readiness.
- Unit tests for core workflow/payment/return/distribution rules.
- Playwright browser smoke tests for public/mobile pages and auth redirects.
- GitHub Actions CI for audit, typecheck, unit tests, E2E tests, and production build.

## Next hardening steps

1. Add authenticated Playwright E2E tests against a staging Supabase project.
2. Add Sentry or equivalent runtime error monitoring.
3. Move production env values from `.env.production` into Vercel Environment Variables, then remove the file from Git.
4. Add user-facing documentation and training videos.
5. Add WhatsApp Business API integration for real outgoing messages.
6. Add printer profile support for 80mm thermal receipts.

## Release gate

No production release should be accepted unless:

```bash
npm run audit:ci
npm run typecheck
npm run test:run
npm run build
```

all pass.
