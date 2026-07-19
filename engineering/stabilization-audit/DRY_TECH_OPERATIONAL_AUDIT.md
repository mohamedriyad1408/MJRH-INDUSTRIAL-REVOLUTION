# Dry Tech Operational Audit

**Status:** Audit only — no implementation  
**Code baseline:** current production `main` is CI #239 (`47048f6e`) while this report is authored on `feature/mjrh-v3-core-platform`.  
**Database baseline:** evolved additive schema remains present.

## Summary

Dry Tech identity and historical data are present. The major risk is not missing records; it is compatibility between the CI #239 frontend and the evolved database/runtime state.

## Data Snapshot

| Area | Count |
|---|---:|
| Branches | 2 |
| Employees | 12 |
| Customers | 8 |
| Services | 205 |
| Orders | 530 |
| Order Items | 1103 |
| Service Units | 1647 |
| Pickup Requests | 9 |
| Journal Entries | 642 |

Relationship checks currently show zero broken links for Orders → Customers, Order Items → Orders, Service Units → Orders, and Employees → Branches.

## Screen Audit

| Capability | Route | Status | Root Cause | Frontend | Backend | DB Compatibility | Missing Asset | Legacy Dependency | Priority |
|---|---|---|---|---|---|---|---|---|---|
| Login | `/login?tenant=dry-tech` | Partial | Needs manual credential validation. | Possible auth/session issue unknown. | Supabase auth assumed available. | Compatible. | No. | Existing auth. | P0 |
| Tenant Entry | `/dry-tech` | Works | Public tenant entry loads. | OK. | OK. | Compatible. | No. | Legacy tenant landing. | P0 |
| Sidebar | tenant app shell | Partial | CI #239 uses static/legacy sidebar and role checks. | High risk. | OK. | New nav assets ignored by CI #239 frontend. | Yes, not consumed. | Static sidebar. | P0 |
| Dashboard | `/$tenant/dashboard` | Partial | Component-based dashboard predates platform assets. | Likely works but not asset-driven. | Data exists. | Compatible. | Dashboard assets not adopted. | Legacy dashboard. | P1 |
| Today's Operations | `/$tenant/today`, `/$tenant/daily-operations` | Partial | Component-coded daily logic. | Likely works. | Data exists. | Compatible. | Not asset-driven. | Legacy operational widgets. | P1 |
| Orders List | `/$tenant/orders` | Likely Works | Historical orders intact. | Existing CI #239 route expected to work. | Data OK. | Compatible. | Work Order bridge ignored. | Legacy Orders. | P0 |
| Order Details | `/$tenant/orders/$id` | Likely Works | Data intact; historical order model preserved. | Existing route expected. | Data OK. | Compatible. | Document engine not used. | Legacy order details. | P0 |
| New Order | `/$tenant/orders/new` | Partial | Uses old order/service catalog logic. | Likely works if service catalog loads. | DB functions may be newer but mostly additive. | Medium risk. | Not generator-driven. | Legacy POS/order intake. | P0 |
| Customers | `/$tenant/customers` | Likely Works | Customer data intact. | Existing route expected. | OK. | Compatible. | CRM assets not used. | Legacy CRM route. | P0 |
| CRM | `/$tenant/crm` | Partial | Pack not adopted in CI #239 frontend. | Likely route exists. | Data partial. | Compatible. | CRM pack assets unused. | Legacy CRM. | P1 |
| Services | `/$tenant/services` | Likely Works | 205 services intact. | Existing route expected. | OK. | Compatible. | Data pack not used. | `dry-tech-catalog`/legacy service UI. | P0 |
| Stations | `/$tenant/stations/*` | Likely Works | Old station routes still present in CI #239. | Expected better than platform version. | service_units intact. | Compatible. | Work Area assets ignored. | Station-specific routes. | P0 |
| Workflows | `/work-orders`, station routes | Partial | CI #239 predates canonical Work Order adoption. | Work order page may exist but not primary. | New tables exist. | Additive compatible. | New assets ignored. | Mixed v1/v2. | P1 |
| Driver | `/$tenant/driver` | Partial | Driver data/route likely exists. | Existing route expected. | Data exists. | Compatible. | Field Service pack ignored. | Legacy driver flow. | P1 |
| Pickup | `/$tenant/pickups` | Partial | Pickup data exists. | Route may exist. | OK. | Compatible. | Field Service pack ignored. | Legacy pickup. | P1 |
| Live Map | `/$tenant/live-map` | Partial | Route/component-based. | Likely works if map deps OK. | Data maybe limited. | Compatible. | Field Service pack ignored. | Legacy map. | P1 |
| Accounting | `/$tenant/accounting`, `/ledger`, `/receivables`, `/cash-closing` | Partial | Journal data intact but newer triggers may have added entries. | Existing routes expected. | Data OK. | Medium risk due newer accounting functions. | Accounting pack ignored. | Legacy accounting. | P0 |
| Reports | `/$tenant/reports` | Partial | Component-driven reports. | Likely route exists. | Views exist. | Compatible. | Report definitions ignored. | Legacy reports. | P1 |
| Staff | `/$tenant/staff/*` | Partial | Staff data exists; i18n hotfix rolled back with CI #239. | Possible raw labels again. | Data exists. | Compatible. | HR pack ignored. | Legacy HR. | P1 |
| Settings | `/$tenant/settings` | Partial | Legacy settings likely works. | Route exists. | DB evolved. | Medium risk. | Business DNA config ignored. | Legacy settings. | P2 |
| Notifications | topbar / center | Partial | Notification center exists; event engine ignored. | Likely works with old notifications. | Data exists. | Compatible. | Automation assets ignored. | Legacy notifications. | P1 |
| Customer Portal | `/customer-portal?tenant=dry-tech` | Likely Works | Public route preserved. | Expected works. | Order/customer data OK. | Compatible. | Customer Experience pack ignored. | Legacy portal. | P0 |

## Dry Tech Readiness Estimate

**Current Dry Tech readiness: 68%**

Reasoning: historical data and old routes are mostly present, but full behavior must be manually validated and several runtime areas remain legacy/component-driven.
