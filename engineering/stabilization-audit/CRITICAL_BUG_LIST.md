# Critical Bug List

| ID | Issue | Impact | Priority | Notes |
|---|---|---|---|---|
| BUG-001 | Dry Tech sidebar/runtime still not verified in browser after CI #239 rollback. | Owner may not see expected navigation. | P0 | Requires manual browser smoke. |
| BUG-002 | Super Admin readiness not manually verified after rollback. | Admin may be partially broken. | P0 | Requires login/admin smoke. |
| BUG-003 | CI #239 frontend ignores many new platform tables. | New platform features unavailable. | P1 | Expected after rollback. |
| BUG-004 | Legacy bootstrap still exists. | Hidden mutations possible. | P1 | Keep controlled until template-aware replacement. |
| BUG-005 | Accounting journal count changed over time. | Need confirm expected entries. | P1 | Data not lost, but count drift should be understood. |
| BUG-006 | `staff.commission` fix may not exist in CI #239 rollback. | Raw i18n key may reappear. | P2 | UI hotfix may need cherry-pick if desired. |
