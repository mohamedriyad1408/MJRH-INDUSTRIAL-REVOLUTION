# MJRH Demo Script

## Goal

Show that MJRH is not a CRUD app. It is a full laundry operating system.

## Demo tenant

Use a seeded tenant such as:

```txt
/mjrh-demo
```

Create it with:

```bash
SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... npm run demo:seed
```

Dry-run without creating data:

```bash
SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... npm run demo:dry-run
```

## 10-minute sales flow

1. Open `/landing` and explain the value proposition.
2. Open `/mjrh-demo` and show customer/staff entry points.
3. Log in as owner/staff.
4. Open **تشغيل اليوم** and explain readiness vs end-of-day.
5. Open **الطلبات** and show orders in different states.
6. Open an order and show the full order journey: station moves, payment, APDO, WhatsApp messages, and attachments.
7. Open **الخريطة** and show pickup/ready/out-for-delivery pins.
8. Open **فحص النظام** and show APDO, financial audit, WhatsApp outbox, and client errors.
9. Open **المحاسبة والخزنة** and show cash/journal behavior.
10. Open **دليل الاستخدام** to show role-based onboarding.

## Key talking points

- New tenants are bootstrapped automatically.
- Worker queues exclude delivered/cancelled work.
- Customer returns after delivery do not reopen the old order.
- InstaPay overpayment becomes courier tip.
- WhatsApp is manual via wa.me link to avoid API cost.
- CI verifies build, unit tests, public E2E, bundle size, and new tenant readiness.
