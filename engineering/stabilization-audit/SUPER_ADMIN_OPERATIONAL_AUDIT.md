# Super Admin Operational Audit

**Status:** Audit only — no implementation

## Summary

The Super Admin area is expected to be closer to the CI #239 stable baseline because runtime code was rolled back. However, the database is newer, so pages that query platform-foundation tables may behave differently.

| Area | Route | Status | Root Cause | Blocking Issues | Required Fixes | Priority |
|---|---|---|---|---|---|---|
| Admin Login | `/login` then `/admin` | Partial | Requires manual super_admin credential validation. | Unknown credential/session state. | Manual auth smoke. | P0 |
| Dashboard | `/admin` | Partial | CI #239 admin dashboard expected. | Unknown runtime API errors. | Browser smoke. | P0 |
| Organizations | `/admin/tenants` | Partial | Tenant table exists; new metadata additive. | Possible UI mismatch with newer metadata. | Validate tenant list/load detail. | P0 |
| Users | `/admin/users` | Partial | user_roles/auth data exists. | Possible role naming mismatch. | Validate listing and role assignment. | P1 |
| Templates | `/admin/templates` | Partial | Template tables evolved. | CI #239 may not know new manifest tables. | Validate read-only load. | P1 |
| Billing | `/admin/billing` | Partial | Billing tables evolved. | Mixed legacy/new billing objects. | Validate page. | P2 |
| Platform Builder | `/admin/platform-builder` | Partial | Builder may expect current platform tables. | CI #239 may predate some changes. | Validate load only. | P1 |
| Workflow Builder | `/admin/workflow-builder` | Partial | workflow tables exist. | New/old workflow model coexist. | Validate builder pages. | P1 |
| Telemetry | `/admin/telemetry` | Partial | telemetry/client error tables exist. | Unknown query compatibility. | Validate. | P2 |
| Observability | new core observability tables | Partial | DB has tables, CI #239 UI may not expose. | No UI expected. | Future UI. | P3 |
| Reports | `/admin/report-builder` | Partial | report builder exists. | May depend on new definitions. | Validate. | P2 |
| Permissions | admin role controls | Partial | CI #239 uses role checks. | New Permission Engine ignored. | Future adoption. | P1 |
| Navigation Assets | core tables only | Partial | DB has assets; CI #239 likely ignores. | No admin UI expected. | Future Platform admin UI. | P2 |
| Capability Registry | core tables only | Partial | DB has registry; CI #239 likely ignores. | No admin UI expected. | Future Capability admin. | P2 |

## Super Admin Readiness Estimate

**Current Super Admin readiness: 60%**

Reasoning: old admin routes likely exist, but without browser-auth validation and with evolved schema, actual readiness is unknown until manual smoke tests run.
