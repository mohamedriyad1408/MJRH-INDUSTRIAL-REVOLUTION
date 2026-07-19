# Knowledge Preservation Index

**Status:** Documentation only

Scores are qualitative planning indicators based on current evidence.

| Index | Score | Explanation |
|---|---:|---|
| Business Knowledge Preserved | 76% | Most source evidence still exists in routes/components/helpers/data, but some capability behavior requires rebuild. |
| Architecture Preserved | 72% | Core/Template/Capability direction is documented and partially implemented, but runtime still has legacy station/order assumptions. |
| Configuration Preserved | 64% | Some config exists in core tables/templates, but navigation, reports, dashboards, notifications, and rules remain component/code-driven. |
| Technical Debt Remaining | 38% | Legacy bootstrap, station routes, workflow v1, station redirects, and order-only finance remain significant. Lower is better. |
| Platform Readiness | 58% | Dry Tech access restored and generator works, but pack-driven behavior is incomplete. |
| Generator Readiness | 52% | Core generation can create departments/roles/workflow, but full navigation/actions/reports/data packs are missing. |
| Future SaaS Readiness | 55% | Multi-tenant foundation and templates exist; owner-friendly initialization and pack marketplace behavior are not implemented yet. |

## Score Rationale

### Business Knowledge Preserved — 76%

Most old behavior can be studied from existing source files, but the most important architecture pieces cannot be copied directly.

### Architecture Preserved — 72%

The architecture documents and branch discipline are strong. Runtime still has legacy assumptions.

### Configuration Preserved — 64%

Configuration exists for core setup, templates, roles, navigation items, and financial events, but many business behaviors are still hardcoded.

### Technical Debt Remaining — 38%

Legacy debt is concentrated but dangerous. The highest-risk items are legacy bootstrap and station/order hardcoding.

### Platform Readiness — 58%

Enough exists to begin implementation, but not enough to claim complete Platform Generator behavior.

### Generator Readiness — 52%

Generator proves direction but lacks full assets: navigation actions, report widgets, data packs, permission mapping.

### Future SaaS Readiness — 55%

The concept is viable. Execution must now replace legacy behavior with generated capability-driven behavior.
