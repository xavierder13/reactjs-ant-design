---
description: Verify this repository's own layers (page, service, store, hook) actually agree with each other for a specific feature
argument-hint: <feature/page/module name, or leave empty for the current uncommitted changes>
---

Validate the internal wiring for `$ARGUMENTS` (or, if empty, the current
uncommitted changes) within this repository.

Use the `contract-checker` agent for this — it applies the
`internal-contract-review` skill's checklist (page↔service↔store↔hook
agreement, routing registration, cross-page status/permission vocabulary
consistency), citing the actual code at each layer boundary for every
finding.

This repo cannot see the Laravel backend, so anything about actual backend
behavior is reported as assumed-from-frontend-usage, not confirmed — for a
real backend contract check, use the `hris-workspace`'s
`cross-repository-review` skill or `/cross-check-api` command from the
workspace root instead.

This command does not modify code.
