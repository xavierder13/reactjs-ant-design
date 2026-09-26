---
description: Verify this repository's own layers (page, service, store, hook) actually agree with each other for a specific feature
argument-hint: <feature/page/module name, or leave empty for the current uncommitted changes>
---

Validate this repository's internal wiring (page ↔ service ↔ store ↔ hook,
routing, shared status/permission vocabulary) for `$ARGUMENTS` (or, if
empty, the current uncommitted changes). Delegate to the `contract-checker`
agent. Backend behavior is reported as assumed, not confirmed — a real
backend contract check is the workspace's `/cross-check-api`. Report-only.
