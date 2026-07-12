# MJRH Capability Lifecycle

**Status:** Official capability evolution process

---

## Lifecycle

```txt
Business Need
↓
Business Knowledge
↓
Capability
↓
Capability Pack
↓
Template
↓
Generated Organization
↓
Runtime
↓
Evolution
```

---

## 1. Business Need

**Entry criteria:** a real business problem is observed.

**Exit criteria:** problem is described without technical solution.

---

## 2. Business Knowledge

**Entry criteria:** need is confirmed.

**Responsibilities:** define terms, actors, rules, inputs, outputs, events.

**Exit criteria:** represented in Business Knowledge Model / Rule Registry / Event Registry.

---

## 3. Capability

**Entry criteria:** business knowledge is reusable beyond one organization.

**Responsibilities:** define capability boundary and ownership.

**Exit criteria:** classified as Core, Platform Capability, Pack, Template Asset, Demo Data, or Obsolete.

---

## 4. Capability Pack

**Entry criteria:** capability is reusable across industries.

**Responsibilities:** package workflows, rules, documents, forms, reports, navigation, events.

**Exit criteria:** pack manifest and assets defined.

---

## 5. Template

**Entry criteria:** industry/business preset needs composition.

**Responsibilities:** compose packs and configure labels/defaults.

**Exit criteria:** template can generate organization assets.

---

## 6. Generated Organization

**Entry criteria:** generator applies template/pack config.

**Responsibilities:** hold generated configuration and business data.

**Exit criteria:** organization enters runtime and passes validation.

---

## 7. Runtime

**Entry criteria:** generated organization active.

**Responsibilities:** execute behavior, render UI, enforce permissions, record events.

**Exit criteria:** behavior validated in Dry Tech and new generated orgs.

---

## 8. Evolution

**Entry criteria:** new requirement or gap discovered.

**Responsibilities:** update business knowledge first, then pack/template/config/runtime.

**Exit criteria:** change reviewed, validated, and documented.

---

## Final Rule

No capability may skip Business Knowledge.
