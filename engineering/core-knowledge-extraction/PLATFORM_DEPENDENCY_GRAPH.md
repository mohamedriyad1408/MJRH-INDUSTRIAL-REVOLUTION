# Platform Dependency Graph

**Status:** Documentation only

## Approved Dependency Direction

```txt
Core Platform
↓
Platform Capabilities
↓
Business Capability Packs
↓
Industry Templates
↓
Generated Organizations
↓
Runtime Experience
```

## Expanded Graph

```txt
Core Platform
├── Authentication
├── Organization Engine
├── Branch Engine
├── Actor / Permission Engine
├── Workflow Engine
├── Work Order Engine
├── Task Engine
├── Finance Engine
├── Document Engine
├── Notification Engine
├── Reporting Engine
└── Configuration Engine
    ↓
Platform Capabilities
├── Navigation generation
├── Business Initialization
├── Template Registry
├── Capability Pack Registry
├── Entity Search Registry
├── Validation tooling
└── Audit / Gold Standard validation
    ↓
Capability Packs
├── CRM Pack
├── Workflow Management Pack
├── Field Service Pack
├── Accounting Pack
├── Reporting Pack
├── Notification Pack
├── Document Pack
├── HR Pack
├── Inventory Pack
├── Asset Pack
└── Approval Pack
    ↓
Industry Templates
├── Laundry Template
├── Hotel Template
├── Clinic Template
├── Manufacturing Template
└── Future templates
    ↓
Generated Organizations
├── Dry Tech Gold Standard Organization
├── Demo Organizations
└── Customer Organizations
    ↓
Runtime Experience
├── Navigation
├── Dashboards
├── Orders / Work Orders / Tasks
├── Customer Portal
├── Reports
├── Accounting
└── Notifications
```

## Forbidden Reverse Dependencies

| Forbidden Dependency | Why Forbidden |
|---|---|
| Core Platform → Laundry Template | Makes Core industry-specific. |
| Core Platform → Dry Tech | Makes reference org a platform dependency. |
| Capability Pack → Demo Organization | Demo data must not define capability behavior. |
| Industry Template → Customer Organization runtime data | Templates must not depend on one customer state. |
| Business Knowledge Model → Database schema | Business model must not follow implementation details. |
| Platform Generator → hardcoded station routes | Reintroduces legacy Laundry architecture. |
| Reporting Engine → Laundry order statuses only | Breaks universal reporting. |
| Finance Engine → order-only payments | Blocks Work Order and non-order finance events. |

## Current Risky Reverse Dependencies Detected

- Static sidebar still contains business navigation knowledge.
- Station-specific routes still encode workflow behavior.
- Employee routing still depends on station/job_role assumptions.
- Legacy bootstrap can still influence generated organizations unless contained.
- Finance sync still centers on orders.

These are targets for future recovery, not items to reconnect blindly.
