---
name: internal-contract-review
description: Verify that this repository's own layers (page, service, store, hook) actually agree with each other, and clearly separate what's confirmed from this repo's own code versus what's merely assumed about the Laravel backend it can't see. Use whenever asked to validate a contract, check for a wiring mismatch, or confirm a feature's layers are actually connected correctly in this repository.
---

# Internal contract review (reactjs-ant-design)

This repo cannot validate a *frontend/backend* contract on its own — the
Laravel backend lives in a separate repository not present here. What it
**can** validate rigorously is whether its own layers actually agree with
each other, which is a real and common defect class in a page → service →
store → hook architecture: a rename on one layer that the others don't
follow, a hook that stops exposing something a page still destructures, an
`*Api.js` function whose name no longer matches what the store calls.

**A mismatch is only real if the code proves it.** Read the actual calling
code at each layer boundary side by side — do not report "the page
probably expects X."

## What to check, layer by layer

1. **Page → service**: does the page (or the hook it uses) call an
   `*Api.js` function that actually exists, with the argument shape the
   function actually expects? A renamed/removed export here fails at
   runtime, not at review time, if nothing calls it during normal
   development.
2. **Service → store**: does the store's async action call the service
   function that actually returns what the store's `set()` call assumes
   (e.g. destructuring a field from the response that the service doesn't
   actually return)?
3. **Store → hook**: does the hook actually select and return every field/
   action the pages using it rely on? A hook silently missing a field a
   page destructures produces `undefined` at runtime, not a build error.
4. **Hook/store → page**: for reference/lookup stores using the
   `isLoaded` guard pattern, does the page/hook actually call the matching
   `refresh*` action where the data can go stale (e.g. after a create/edit
   elsewhere), rather than relying on a fetch that will silently no-op
   because `isLoaded` is already true?
5. **Routing wiring**: does a page that's supposed to be reachable actually
   appear in **both** `AppRoutes.jsx` and `MainLayout.jsx`? A page present
   in only one is unreachable or unreachable-with-no-menu-entry — check
   both, not just the router.
6. **Cross-page consistency**: for a status/permission vocabulary shared
   across an Index/View/Edit set of pages (Manpower Request's editable-
   status list is duplicated in three files — see its skill), confirm all
   pages in the set use the same status strings/permission names, not a
   locally-diverged copy.

## What this skill explicitly does NOT confirm

Anything about the actual Laravel backend — whether it truly requires a
field the frontend sends, returns the shape the frontend assumes, enforces
the permission the frontend checks client-side, or uses the exact status
strings the frontend branches on. Report these as **assumed from frontend
usage, not confirmed** rather than as validated facts, and point to the
`hris-workspace`'s `cross-repository-review` skill / `/cross-check-api`
command (run from the workspace root, where the actual backend code is
visible) for real confirmation. Don't fabricate a plausible-sounding
backend contract to fill the gap.

## Reporting

Every finding cites the actual file/line at each layer boundary involved.
Use `test-evidence`'s severity scale and reporting shape, with
`## What was checked` listing exactly which pages/services/stores/hooks
you traced.
