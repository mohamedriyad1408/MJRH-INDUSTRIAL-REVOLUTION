# Dry Tech Gap Analysis — Runtime Behavior

## Current issue

Dry Tech data and platform access are restored, but visible runtime behavior still feels incomplete because parts of the application are not yet adopted onto the new platform services.

## Gaps

| Area | Expected Dry Tech Behavior | Current Runtime Behavior | Missing | Source / Cause | Priority |
|---|---|---|---|---|---|
| Sidebar | Full business navigation in Arabic with orders/customers/reports/accounting/staff/stations. | Improved labels, but fallback and compatibility groups remain. | Full parity from generated assets only. | Static/sidebar compatibility and generated mix. | P0 |
| Orders | Full order list/new/edit/invoice/payment. | Routes exist; not fully Work Order-backed. | Work Order adoption. | Order legacy model. | P0 |
| Stations | Operational station queues. | Station routes exist; not generic work-area UI. | Generic renderer adoption. | Hardcoded station pages. | P1 |
| Reports | Owner/finance/ops reports. | Routes exist; definitions not primary. | Report asset adoption. | Component-coded reports. | P1 |
| Dashboards | Rich owner/operations dashboard. | Dashboard route exists; widgets not asset-driven. | Dashboard widget definitions. | Component-coded dashboards. | P1 |
| Documents | Invoice/receipt/delivery note templates. | Template engine exists; old print components still primary. | Document template adoption. | Hardcoded print UI. | P1 |
| Notifications | Customer/team messages based on events. | Event engine exists; triggers not fully adopted. | Automation rules. | Legacy helpers. | P1 |
| Permissions | Unified permission enforcement. | Navigation/route adoption started; many routes still role-based. | Full route/API action enforcement. | Legacy role checks. | P0 |
| Dry Tech reproducibility | Regenerate from template + data pack. | Historical data exists; not data-pack-driven. | Gold data import. | No data pack yet. | P2 |

## Conclusion

Dry Tech will feel fully restored when the legacy screens are progressively wired to platform services, not when more foundation is added.
