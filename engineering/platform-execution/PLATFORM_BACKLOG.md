# Platform Backlog

| Platform Work | Purpose | Dependencies | Definition of Done | Risk | Complexity |
|---|---|---|---|---|---|
| Capability Pack Registry | Store and load reusable capability definitions. | Config loader, glossary. | pack manifests installable and versioned. | bad pack coupling. | High |
| Template Registry v2 | Compose packs into templates. | Pack registry. | templates install packs/assets without Core changes. | template/core coupling. | Medium |
| Business DNA Resolver | Convert owner answers to config. | Business DNA registry. | DNA outputs pack/template recommendations. | over/under inference. | Medium |
| Business Initialization V2 | Owner-first initialization flow. | DNA resolver, generator. | owner confirms recommendations; no technical language. | UX confusion. | High |
| Navigation Service | Generate role-aware nav. | Core nav engine, pack assets. | Dry Tech nav parity plan starts here. | permission leaks. | High |
| Permission Mapping Service | Map generated roles to runtime access. | Core permissions. | core_roles/user_roles alignment. | access regression. | High |
| Search Service | Generic entity search. | Entity registry. | customers/orders/work orders searchable by config. | inconsistent indexing. | Medium |
| Notification Service | Event-triggered messages. | Event bus, Notification Pack. | templates/triggers configured. | message spam. | Medium |
| Reporting Service | Generate reports from definitions. | Reporting Pack, entities. | reports as assets, not only components. | performance. | High |
| Dashboard Service | Generate widgets/next actions. | Reporting service. | first success dashboard generated. | weak UX. | Medium |
| Automation Service | Trigger/action rules. | Event bus, config. | automations explicit and auditable. | hidden side effects. | High |
| AI Advisor Service | Explain/recommend/warn. | Reporting, events, business knowledge. | advisory rules do not hardcode industry. | hallucinated advice. | Medium |
