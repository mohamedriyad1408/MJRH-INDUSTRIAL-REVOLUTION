# Legacy Retirement Plan

**Status:** Documentation only

Every legacy source receives exactly one status.

| Legacy Source | Status | Reason | Retirement Condition |
|---|---|---|---|
| `components/app-sidebar.tsx` static business arrays | Temporary Compatibility | Contains valuable navigation evidence but must not remain source of truth. | Generated navigation assets reach parity. |
| `routes/$tenant/stations/cleaning.tsx` | Temporary Compatibility | Station-specific route supports current Dry Tech but hardcodes work area. | Generic work-area renderer validated. |
| `routes/$tenant/stations/ironing.tsx` | Temporary Compatibility | Same as above; includes Laundry-specific behavior. | Generic renderer + Laundry Template station config. |
| `routes/$tenant/stations/packing.tsx` | Temporary Compatibility | Same as above. | Generic renderer parity. |
| `routes/$tenant/stations/qc.tsx` | Temporary Compatibility | QC should become Quality Pack behavior. | Quality Pack + generic workflow renderer. |
| Other station route files | Temporary Compatibility | One-file-per-station is not V3 architecture. | Generic renderer replaces them. |
| `lib/legacy/laundry-workflow-v1.ts` | Reference | Preserves old business intent but conflicts with V3 runtime. | Delete/archive after Work Order bridge validated. |
| `lib/legacy/laundry-validation-rules.ts` | Extract | Contains useful laundry rule intent. | Extract rules to Laundry Template/Validation Pack. |
| `lib/rules/workflow-engine-v1.ts` | Reference | Old workflow logic. | Delete/archive after v2/v3 execution validated. |
| `lib/station-workflow.ts` | Extract | Contains station movement knowledge but mixed with legacy assumptions. | Extract generic workflow ideas; retire station-specific runtime. |
| `lib/rules/ironing-distribution.ts` | Extract | Contains work distribution/compensation knowledge. | Move to compensation/distribution pack or Laundry Template. |
| `lib/rules/order-routing.ts` | Rewrite | Order routing must evolve to Work Order/Task routing. | Work Order bridge ready. |
| `lib/rules/payment.ts` | Extract | Payment rules useful but need generic finance mapping. | Accounting Pack abstraction. |
| `lib/dry-tech-catalog.ts` | Extract | Catalog knowledge useful for Dry Tech data pack/template curation. | Data pack extracted and curated defaults approved. |
| `scripts/seed-demo-tenant.mjs` | Reference | Useful demo evidence but bypasses generator. | Declarative Demo Data Import exists. |
| `scripts/generate-reference-dry-tech.mjs` | Temporary Compatibility | Useful proof script, not final gold standard generator. | Gold Standard Generator/Data Import exists. |
| Legacy `seed_tenant_defaults` functions/triggers | Delete | Hidden mutation path; caused service count risk. | Template-aware organization creation fully replaces it. |
| Direct station/job_role redirects | Rewrite | Employee routing should use actor/task/work-area assignments. | Assignment model ready. |
| Order-only financial sync as universal model | Rewrite | Finance must work for orders, work orders, subscriptions, adjustments. | Generic Financial Transaction mapping ready. |

## Rule

No item may remain Unknown.

If new legacy source is found during implementation, add it here before touching it.
