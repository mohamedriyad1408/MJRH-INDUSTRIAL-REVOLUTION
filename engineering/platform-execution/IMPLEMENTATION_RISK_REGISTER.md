# Implementation Risk Register

| Risk | Likelihood | Impact | Mitigation | Owner | Validation |
|---|---|---|---|---|---|
| Reintroducing hardcoded Laundry logic | Medium | Critical | constitution + PR checklist + code review | Architecture owner | search for industry conditionals |
| Permission regression | Medium | Critical | permission engine tests and Dry Tech role validation | Core owner | owner/manager/employee/courier checks |
| Historical Dry Tech data corruption | Low-Medium | Critical | backup/restore test, non-destructive bridge | Data owner | record/relationship validation |
| Work Order bridge breaks order flow | Medium | High | compatibility mode and rollback | Operations owner | old order open/edit/new order tests |
| Accounting remap corrupts journals | Medium | Critical | no journal rewrite; bridge only first | Finance owner | ledger/profit/trial reports |
| Legacy bootstrap side effects | High | High | replace/contain with generator-aware flow | Platform owner | new tenant regression test |
| Generated navigation exposes wrong routes | Medium | High | role-aware visibility tests | Platform owner | navigation matrix validation |
| Capability pack coupling to industry | Medium | High | pack review against glossary/constitution | Pack owner | works without Laundry test |
| Business Initialization overwhelms owner | Medium | Medium | UX blueprint and decision budget | Product owner | user journey review |
| Demo data leaks into Core | Low | High | data import separation | Demo owner | dependency review |
| Documentation not followed during implementation | Medium | High | PR template/checklist enforcement | Tech lead | checklist required |
| Scope creep into new documentation sprints | Medium | Medium | execution blueprint freeze | CTO/Product | sprint governance |
