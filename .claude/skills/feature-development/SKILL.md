---
name: feature-development
description: Scope and implement a new page/feature in this repository — page, service, store, and hook — by matching the nearest existing precedent instead of inventing a new pattern. Use whenever asked to add, build, or scaffold a new feature/module/page in this repository.
---

# Feature development (reactjs-ant-design)

This is the one skill in this repo's `.claude/` that builds rather than
reports. Everything else here (`code-review`, `internal-contract-review`,
`feature-tester`) defaults to report-only; adding a feature is inherently a
build task.

## Orient before writing any code

1. Read this repo's root `CLAUDE.md` in full — architecture, routing,
   state-management, API/service, auth, form, table, and notification
   conventions are all documented there; don't re-derive them.
2. Find the nearest existing module of the same shape (a list+form module
   like Manpower Request, a template/evaluation module like KPI) and match
   its file layout and its module-specific choices (POST-only vs REST
   verbs, which notification pattern) — **don't unify** a module's
   existing choice with a different module's just because it looks
   inconsistent; that inconsistency is documented as deliberate.
3. If a `.claude/skills/<module>/SKILL.md` already exists for the module
   (e.g. `manpower-request`, `employee-master-data`), read it for the
   maintained business rules/file map before assuming anything.
4. If the feature needs a new or changed backend endpoint, this repo
   cannot implement or confirm that — the Laravel backend lives in a
   separate repository. Say exactly what backend support the feature would
   need and stop there for that part, rather than inventing a plausible
   endpoint shape. Use the `hris-workspace`'s own `/add-feature` from the
   workspace root (or `vueportal`'s own `/add-feature`) for the backend
   half.

## Build to precedent, not to taste

- One page folder per module under `src/pages/<module>/`, one thin
  `*Api.js` per resource under `src/services/<module>/` (axios calls only,
  no business logic), one Zustand store per resource under `src/store/`
  (`{ data, isLoading, isLoaded?, error }` shape, `isLoaded` guard +
  `refresh*` for reference data), one `use<Resource>.js` hook wrapping it.
- Register the new page in **both** `AppRoutes.jsx` (`permissionRoutes`
  entry with the right `permissions`, through `ProtectedRoute`) **and**
  `MainLayout.jsx` (`menuData` + `titleMap`/`getPageMeta`) — a page missing
  either is unreachable; this is the single most common way a
  fully-implemented feature still doesn't work for a real user.
- Match the nearest sibling module's REST-verb-vs-POST-only choice, its
  table/permission/ownership gating style, and (for a new page) prefer
  `App.useApp()` for notifications unless told otherwise.
- Check any AntD component prop against the installed v6 API
  (`node_modules/antd/es/<component>` / its `.d.ts`) before relying on a
  recalled prop name — see `code-review` for confirmed rename/deprecation
  cases already found in this version.

Build the smallest complete version of what was actually asked — no
speculative extensibility, no extra pages/fields beyond the request, and no
new test framework or tooling this project doesn't already have.

If it's ambiguous which module a feature belongs to, or whether it needs a
backend change this repo can't make, ask before writing code.

## After implementing

If a `.claude/skills/<module>/SKILL.md` exists for the module you touched,
update it — but **edit the relevant existing statements in place** to
describe the new current state, and delete anything the change made
untrue. Don't append a dated "Done, added YYYY-MM-DD" entry; the narrative
(what changed, why, bugs found, how it was verified) goes in the commit
message and, if worth keeping, `docs/<module>-history.md`. Don't add module
detail to `CLAUDE.md` — at most an entry under "Modules with their own
skill". If a new module is non-trivial and has no skill yet, propose one
(ask first).

This skill builds the feature; it does not certify it. Hand off to
`code-review`, `internal-contract-review`, and the `feature-tester` agent
(or their commands) as the next steps.

## Safety

No new test framework/tooling introduced unasked, no secrets committed, no
discarding uncommitted work found in this repo while building something
else.
