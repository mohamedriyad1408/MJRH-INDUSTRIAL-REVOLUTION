# Repository Inventory

**Status:** Audit only — no deletion

| Path | Category | Keep | Archive | Delete Candidate | Reason |
|---|---|---|---|---|---|
| `routes/` | Legacy + Runtime | Yes | No | No | Active app routes. Needs adoption audit. |
| `components/` | Runtime + Business Knowledge | Yes | Partial | No | Active UI and recoverable behavior. |
| `lib/` | Mixed | Yes | Partial | No | Utilities, rules, legacy knowledge. |
| `lib/legacy/` | Legacy | No runtime long-term | Yes | Later | Reference only after extraction. |
| `lib/dry-tech-catalog.ts` | Dry Tech / Template candidate | Temporary | Yes | Later | Must become data/config. |
| `scripts/` | Demo / Ops / Temporary | Partial | Yes | Later | Some scripts bypass generator; keep until replaced. |
| `supabase/migrations/` | Database history | Yes | No | No | Must preserve migration history. |
| `supabase/functions/` | Runtime backend | Yes | No | No | Edge functions active/possible. |
| `engineering/business-knowledge/` | Permanent Architecture | Yes | No | No | Source of architectural truth. |
| `engineering/core-knowledge-extraction/` | Permanent Architecture | Yes | No | No | Knowledge preservation. |
| `engineering/platform-governance/` | Permanent Architecture | Yes | No | No | Governance truth. |
| `engineering/reference-environments/` | Permanent Recovery Docs | Yes | No | No | Recovery/Gaps/Gold Standard records. |
| `engineering/platform-execution/` | Execution planning | Yes | No | No | Roadmap/validation. |
| `engineering/adoption-audit/` | Adoption audit | Yes | No | No | Current audit outputs. |
| `docs/` | Mixed docs/demo media | Yes | Yes | Review later | Some investor/demo docs may be archived later. |
| `demo-video/` | Demo media | No runtime | Yes | Later | Large/static demo assets; archive later after approval. |
| `e2e/` | QA | Yes | No | No | Needed CI. |
| `tests/` | QA | Yes | No | No | Needed CI. |
| generated files like `arabic_occurrences.txt` | Temporary analysis | No | Yes | Delete candidate | Should be regenerated if needed. |
| old video/mp4 artifacts | Demo | No runtime | Yes | Delete candidate | Archive after approval. |
