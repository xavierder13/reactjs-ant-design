---
description: Verify a newly created or modified page/feature against this project's own conventions (lint, build, CLAUDE.md/skill checks)
argument-hint: <page/feature/module to verify, or leave empty for the current uncommitted changes>
---

Run the `feature-tester` agent against `$ARGUMENTS` (or, if empty, the
current uncommitted changes in this repository) to verify it end-to-end
within this project's own constraints.

The agent runs this project's real automated checks (lint, build) via the
Docker dev container, statically verifies the change against this
repository's `CLAUDE.md` conventions and any relevant skill
(`manpower-request`, `employee-master-data`), and reports a structured
PASS/FAIL/BLOCKED result.

This is a **static + build/lint check scoped to this frontend repository
only** — it does not call a live backend, does not verify a frontend/
backend contract, and does not invent a test framework this project
doesn't have (there is currently no Jest/Vitest/Playwright/Cypress here;
the agent re-confirms that each run rather than assuming it). For a full
cross-repository integration test, use the `hris-workspace`'s
`/test-feature` command from the workspace root instead.

This command does not modify, refactor, or fix the feature it verifies.
