---
description: Verify a newly created or modified page/feature against this project's own conventions (lint, build, CLAUDE.md/skill checks)
argument-hint: <page/feature/module to verify, or leave empty for the current uncommitted changes>
---

Verify `$ARGUMENTS` (or, if empty, the current uncommitted changes) with
the `feature-tester` agent: lint/build, static checks against `CLAUDE.md`
and the module's skill, and a PASS/FAIL/BLOCKED report. Frontend-only — no
live backend; for a full cross-repository test use the workspace's
`/test-feature`. Doesn't modify the feature.
