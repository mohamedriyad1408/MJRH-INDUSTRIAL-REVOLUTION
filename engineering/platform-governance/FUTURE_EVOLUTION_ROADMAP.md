# MJRH Future Evolution Roadmap

**Status:** Architecture roadmap only — not a feature roadmap

---

## Evolution Path

```txt
Platform Generator
↓
Capability Packs
↓
Marketplace
↓
Partner APIs
↓
AI Agents
↓
Cross Organization
↓
Enterprise Governance
↓
Multi-region
↓
Offline Runtime
↓
Federation
```

---

## 1. Platform Generator

Current architecture supports this through Business Operating Model, Business DNA, template registry, core setup profiles, and generated assets.

Required maturity: generated navigation, permissions, work orders, data packs.

---

## 2. Capability Packs

Supported by documented pack lifecycle and extraction matrix.

Required maturity: pack registry, asset manifests, dependency rules.

---

## 3. Marketplace

Templates and packs become installable/configurable packages.

Current architecture supports this because templates are replaceable and packs are composable.

---

## 4. Partner APIs

External systems can contribute events, documents, customers, payments, inventory, or tasks.

Requires stable domain event registry and public capability contracts.

---

## 5. AI Agents

AI can advise, detect risk, suggest workflows, summarize reports, and guide owners.

Requires Business Knowledge Model, event registry, and governance guardrails.

---

## 6. Cross Organization

Multi-org reporting, benchmarking, franchising, holdings.

Requires strict organization isolation and controlled aggregate views.

---

## 7. Enterprise Governance

Complex permissions, approvals, audits, compliance.

Requires strong Actor/Role/Approval/Document engines.

---

## 8. Multi-region

Supports regional data, language, tax, currency, latency, compliance.

Requires Business DNA by country and deployment governance.

---

## 9. Offline Runtime

Field/mobile operations need offline task execution.

Requires stable Task/Work Order/Event model and sync conflict rules.

---

## 10. Federation

Multiple MJRH instances or partner systems exchange events/configuration safely.

Requires domain event contracts and strict dependency boundaries.

---

## Final Rule

Current architecture supports every stage if Core remains isolated and behavior remains configuration-first.
