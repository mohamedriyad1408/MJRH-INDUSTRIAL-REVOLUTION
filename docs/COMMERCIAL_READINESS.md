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
- Authenticated Playwright E2E tests against a staging Supabase project.
- Runtime client error monitoring and Supabase error logs.
- Production environment variables moved to Vercel Environment Variables and `.env.production` removed from Git.
- User-facing documentation and training videos (`docs/USER_GUIDE_AR.md`, `docs/DEMO_VIDEO_SCRIPT_AR.md`).
- WhatsApp Business API integration via Supabase Edge Functions (`whatsapp-send`).
- Printer profile support for 80mm thermal receipts alongside standard A4 web invoices.

## Release gate

No production release should be accepted unless:

```bash
npm run audit:ci
npm run typecheck
npm run test:run
npm run build
```

all pass.

## Feature propagation

Any new feature must satisfy `docs/FEATURE_PROPAGATION_CHECKLIST.md` so it works for newly created tenants, not only the current production tenant.
