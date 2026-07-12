# Generator Backlog

| Generator Work | Purpose | Dependencies | Definition of Done | Risk | Complexity |
|---|---|---|---|---|---|
| Business DNA Loading | Load owner answers and inferred traits. | DNA registry. | validated DNA object created. | wrong defaults. | Medium |
| Capability Selection | Select packs from operating model + DNA. | Pack registry. | deterministic pack list. | over-selection. | Medium |
| Capability Installation | Apply pack assets. | Pack manifests, config loader. | pack assets installed idempotently. | duplicate assets. | High |
| Template Composition | Merge template assets with packs. | Template registry. | no Core changes needed per template. | conflict resolution. | High |
| Navigation Generation | Generate role-aware nav. | Navigation service, permissions. | nav items installed and visible by role. | permission leak. | High |
| Role Generation | Generate roles/responsibilities. | Permission service. | core_roles and runtime roles aligned. | access regression. | High |
| Permissions | Enforce generated access. | Permission engine. | UI/API both guarded. | security risk. | High |
| Default Dashboards | Generate first/owner dashboards. | Reporting/dashboard pack. | first success dashboard works. | weak UX. | Medium |
| Default Reports | Generate report definitions. | Reporting pack. | reports available from assets. | performance. | Medium |
| Initialization | Owner-first flow. | Business Initialization V2. | nontechnical owner can complete. | UX confusion. | High |
| Validation | Prove generated org works. | validation engine. | new org + Dry Tech validation pass. | false positives. | Medium |
| Demo Creation | Generate sample data safely. | Demo Data Import. | disposable demo orgs created/deleted. | demo data leakage. | Medium |
