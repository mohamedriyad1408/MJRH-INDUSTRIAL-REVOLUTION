# MJRH Development Discipline

**Status:** Permanent team discipline — pending review  
**Branch policy:** No direct development on `main`.

---

## 1. Branching Rules

- Never develop on `main`.
- Feature branches only.
- Current Platform Generator branch: `feature/mjrh-v3-core-platform`.
- `main` represents stable production-ready code.
- Pull Request required before merge.

---

## 2. Review Rules

- Architecture review before implementation for major changes.
- Documentation before implementation.
- Business Knowledge Model updates before new business concepts.
- Architecture Review Checklist required for every PR.
- CI required before merge.

---

## 3. Dry Tech Rules

- Dry Tech is the Official Gold Standard Organization.
- Dry Tech validation is required before approval.
- Dry Tech is not a development environment.
- Dry Tech is not a sandbox.
- Dry Tech should become reproducible through Template → Platform Generator → Demo Data Import.

---

## 4. Engineering Workspace Rules

- No developer reminders inside production UI.
- No temporary implementation notes in customer-facing screens.
- No raw technical notes in demo/customer data.
- All engineering notes belong under `engineering/`.

---

## 5. Implementation Rules

Before writing code, ask:

```txt
Am I improving the Core Platform, or solving only one industry's problem?
```

If solving only one industry:

```txt
Stop and redesign.
```

---

## 6. CI and Validation

Minimum validation before PR approval:

```bash
npm run typecheck -- --pretty false
```

Additional tests should be added as implementation begins.

---

## 7. Final Rule

Professional discipline protects the Core Platform.
