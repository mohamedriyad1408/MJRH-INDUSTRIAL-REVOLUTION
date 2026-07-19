# Project Critical Path

## Critical Path

```txt
Permission Engine
↓
Generated Navigation
↓
Capability Pack Registry
↓
Work Order + Task Bridge
↓
Generic Work-Area Renderer
↓
Reporting/Dashboard Pack
↓
Organization Generator Completion
↓
Business Initialization V2
↓
Dry Tech Gold Standard Parity
```

## High-Risk Items

| Item | Risk | Mitigation |
|---|---|---|
| Permission mapping | security exposure | build tests before wide rollout |
| Work Order bridge | historical order/accounting impact | non-destructive compatibility bridge |
| Legacy bootstrap retirement | tenant creation regressions | generator parity and rollback path |
| Accounting mapping | journal corruption | read-only validation and bridge first |
| Station renderer replacement | operations UI regression | keep fallback during transition |

## Long-Lead Items

- Capability Pack registry.
- Business Initialization V2 UX implementation.
- Work Order/Task execution model.
- Report/dashboard asset model.
- Dry Tech data pack extraction.

## Parallel Work

- CRM pack extraction can happen after navigation contract.
- Reporting definitions can progress alongside notification templates.
- Template backlog can progress after pack manifests exist.
- Business DNA question design can progress alongside generator foundation.

## Sequential Work

- Permission before generated nav enforcement.
- Work Order before generic station renderer parity.
- Event bus before notifications/automation.
- Pack registry before marketplace.
- Generator completion before Business Initialization V2 production use.
