---
description: Scope and implement a new page/feature in this repository (page, service, store, hook)
argument-hint: <feature/page/module name and a short description of what it should do>
---

Add the feature described in `$ARGUMENTS` to this repository.

Use the `feature-development` skill for this — it has you read this repo's
own `CLAUDE.md` and find the nearest existing module of the same shape
before writing anything, so this doesn't need to be re-explained from
scratch each time.

This command:
1. Matches the nearest existing module's file layout and its own
   module-specific choices (POST-only vs REST verbs, notification
   pattern) — doesn't unify a module's deliberate inconsistency with a
   different module's.
2. Implements page + service + store + hook, and registers the page in
   **both** `AppRoutes.jsx` and `MainLayout.jsx` (a page missing either is
   unreachable).
3. If the feature needs a new or changed backend endpoint, says exactly
   what's needed and stops there for that part — this repo can't implement
   or confirm backend changes. Use the `hris-workspace`'s own
   `/add-feature` from the workspace root, or `vueportal`'s own
   `/add-feature`, for the backend half.

This command *does* modify code — adding a feature is inherently a build
task, unlike this repo's report-only review/check commands. No new test
framework/tooling introduced unasked, no secrets committed, no discarding
uncommitted work already in this repository.

If `$ARGUMENTS` is empty, ask what the feature is and which module it
belongs to before doing anything.

After implementing, recommend `/review-code`, `/validate-contract`, and
`/verify-feature` as next steps — this command builds the feature, it
doesn't certify it.
