---
description: Targeted code review of a change or area in this repository
argument-hint: <file/diff/area to review, or leave empty for current uncommitted changes>
---

Perform a targeted code review of `$ARGUMENTS` (or, if empty, the current
uncommitted changes in this repository).

Use the `code-reviewer` agent for this — it applies the `code-review`
skill's full checklist (layering, routing registration, error/notification
handling, permission/status/ownership gating, form conventions, Ant Design
v6 API currency), and recommends `contract-checker` if the change
plausibly breaks how this repo's own layers agree with each other.

Do not modify code as part of this command unless explicitly told this
review should also apply its fixes.
