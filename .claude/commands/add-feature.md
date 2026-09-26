---
description: Scope and implement a new page/feature in this repository (page, service, store, hook)
argument-hint: <feature/page/module name and a short description of what it should do>
---

Add the feature described in `$ARGUMENTS` to this repository. If it's
empty, ask what the feature is and which module it belongs to.

Follow the `feature-development` skill. This command **does** modify code
(no new test tooling, no secrets, don't discard uncommitted work). If the
feature needs a new or changed backend endpoint, state exactly what's
needed and stop there for that part — use the workspace's or `vueportal`'s
`/add-feature` for the backend half. Finish by recommending `/review-code`,
`/validate-contract` and `/verify-feature`.
