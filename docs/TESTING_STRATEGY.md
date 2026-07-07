# MJRH Testing Strategy

## Unit tests

Current unit tests cover:

- Reception routing by service type.
- Customer-return policy after delivery.
- Payment matching, underpayment, overpayment, and courier tip calculation.
- Attendance-aware ironing distribution fairness.

## Integration tests to add next

Against a staging Supabase project:

1. Create tenant and verify full bootstrap readiness.
2. Create order with ironing-only service and verify it skips cleaning.
3. Create cleaning+ironing order and verify full station flow.
4. Register internal reclean and verify notifications close after resolution/delivery.
5. Register customer return after delivery and verify original order stays delivered.
6. Upload InstaPay proof and verify payment document, journal, cash transaction, and courier tip.

## E2E tests

Implemented public smoke tests cover:

- Login page renders on desktop and mobile.
- Protected routes redirect anonymous users to login.
- Customer portal loads on desktop and mobile.
- Tenant public entry page loads.

Authenticated E2E tests to add next against staging:

- Owner creates tenant.
- Reception creates order.
- Driver pickup/delivery flow.
- Worker station actions.
- Customer portal payment proof upload.
- System health/APDO repair check.


## Feature propagation

Any new feature must satisfy `docs/FEATURE_PROPAGATION_CHECKLIST.md` so it works for newly created tenants, not only the current production tenant.
