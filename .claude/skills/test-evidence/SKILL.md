---
name: test-evidence
description: Capture review and validation results with enough concrete detail (file, line, page/service/store/hook, actual vs. expected, reproduction steps, severity) that a developer could act on a finding without re-deriving it, ending in a clear real-world recommendation. Use whenever recording the result of a code review or an internal-contract check in this repository. (The feature-tester agent has its own established PASS/FAIL/BLOCKED reporting format for live-testing runs — this skill is for code-reviewer and contract-checker.)
---

# Test evidence

The point of this skill is that a finding from `code-review` and from
`internal-contract-review` are comparable and independently actionable —
same severity scale, same evidence shape, same final verdict style. A
finding that can't be traced to an actual file/line, an actual component,
or an actual observed behavior is not a finding — it's a guess, and gets
reported as one.

## Severity scale

- **BLOCKER** — breaks the feature outright for a normal user (a page
  that's unreachable because it's missing from `AppRoutes.jsx`/
  `MainLayout.jsx`, a hook returning a shape the page destructures
  incorrectly and crashes on).
- **CRITICAL** — a security gap (a permission-gated action rendered without
  the matching `hasPermission`/`hasAnyPermission` check, a client-side-only
  gate with no note that the backend must also enforce it) or a
  correctness bug corrupting local state for some but not all inputs.
- **HIGH** — wrong behavior on a real, reachable path that isn't the happy
  path (a validation gap, a store action that doesn't reset `isLoading`/
  `error` on failure, an ownership check (`record.user_id === user.id`)
  missing where a sibling action has one).
- **MEDIUM** — an inconsistency contained to one area (a notification
  pattern mismatch within a single new page, an AntD prop that's
  deprecated in the installed version but still renders).
- **LOW** — cosmetic, or correct-but-inconsistent with this repo's own
  established convention.
- **INFO** — worth noting, not a defect (an assumption about the backend
  response shape that can't be confirmed from this repo alone — see
  "Confirmed vs. assumed" below).

Don't inflate severity to sound urgent, and don't soften a genuine BLOCKER.
Lead with the highest severity; don't bury it under low-severity notes.

## What each finding needs

- **Where**: exact file + line — page, service (`*Api.js`), store, or hook.
- **What's wrong**: actual vs. expected, stated concretely.
- **Evidence**: the actual code read (the component's call site and the
  service/store/hook it calls, side by side) — cite it, don't paraphrase.
- **Reproduction**: concrete steps or state a developer could replay.
- **Fix direction**: the smallest change in this repo's own established
  style (see `code-review`) — or say plainly you don't have a good
  targeted fix.

## Reporting shape

```
## Summary
## Feature / area
## What was checked        (pages, services, stores, hooks touched)
## Findings                 (most severe first)
## Defects
## Regression risk
## Recommendation
```

`## Recommendation` is the real-world call — ship as-is, ship with the
listed fixes first, or blocked pending a specific unresolved question —
not a restatement of the findings list.

## Confirmed vs. assumed

This repo cannot see the Laravel backend's actual code. Any claim about
what the backend actually validates, returns, or enforces is an assumption
inferred from how the frontend uses it, not a confirmed fact. Report it as
"assumed from frontend usage, not confirmed against backend code" and point
to the `hris-workspace`'s `cross-repository-review` skill (or its
`/cross-check-api` command, run from the workspace root where both
repositories are visible) for anything that actually needs backend
confirmation. Never present an inferred backend behavior as a verified one.
