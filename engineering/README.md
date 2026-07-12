# MJRH Engineering Workspace

This directory is the dedicated Engineering Workspace for internal architecture notes, implementation planning, migration notes, technical decisions, and temporary development reminders.

## Rules

- Customer-facing UI must never contain developer TODOs, temporary implementation notes, or architecture reminders.
- Production data must never be used as a place to store developer reminders.
- Product copy must be written for business owners, not developers.
- Engineering decisions belong here until they become approved documentation or implemented code.
- This workspace is not part of the customer product experience.

## Current Workspace Areas

- `reference-environments/` — Reference organization plans, QA/demo environment lifecycle.
- `business-initialization/` — Setup/initialization redesign, UX flows, copy, validation rules.
- `architecture-decisions/` — ADR drafts and technical decision records.

## Active Branch

All active Platform Generator work must continue on:

```txt
feature/mjrh-v3-core-platform
```

No direct development on `main`.
