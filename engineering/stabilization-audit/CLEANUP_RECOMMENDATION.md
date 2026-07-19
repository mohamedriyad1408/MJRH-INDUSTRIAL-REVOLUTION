# Cleanup Recommendation

**Status:** Planning only — no deletion

| Item | Classification | Recommendation | Reason |
|---|---|---|---|
| `engineering/business-knowledge/` | KEEP | KEEP | Permanent architecture truth. |
| `engineering/core-knowledge-extraction/` | KEEP | KEEP | Permanent source recovery truth. |
| `engineering/platform-governance/` | KEEP | KEEP | Permanent governance. |
| `engineering/reference-environments/` | KEEP | KEEP | Dry Tech recovery/gap truth. |
| `lib/legacy/` | REFERENCE ONLY | ARCHIVE later | Keep until behavior fully extracted. |
| `lib/dry-tech-catalog.ts` | TEMPORARY COMPATIBILITY | ARCHIVE after data-pack extraction | Business data in code. |
| station-specific route files | TEMPORARY COMPATIBILITY | Keep until generic work-area parity | Active runtime fallback. |
| static/sidebar compatibility | TEMPORARY COMPATIBILITY | Keep until generated nav parity | Protects UI. |
| seed/demo scripts | REFERENCE ONLY | Archive after demo data import exists | Bypass generator. |
| generated analysis text files | DELETE AFTER APPROVAL | Not runtime or architecture. | Clean repo later. |
| demo media/video artifacts | ARCHIVE | Move out of app repo later. | Size/no runtime value. |

No deletion should occur before approval and backup.
