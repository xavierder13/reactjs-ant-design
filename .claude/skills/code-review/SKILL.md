---
name: code-review
description: Review React/Ant Design/Zustand code in this repository for correctness, security, and consistency with this repository's own established conventions — not generic React or AntD best practices. Use whenever asked to review code, review a change, or assess code quality anywhere in this repository.
---

# Code review (reactjs-ant-design)

This repo is a React 19 + Vite + Ant Design v6 + Zustand v5 SPA, the
frontend for a separate Laravel backend not present here. Review against
*this repo's own* documented conventions (its `CLAUDE.md`) — this is an
existing production-oriented project; don't recommend refactoring or
modernizing a working pattern just because a different one is theoretically
cleaner.

## Understand before you critique

Read this repo's root `CLAUDE.md` in full first. It documents real,
deliberate decisions — two coexisting notification patterns (match the
page's existing one, don't unify them uninvited), some modules POST-only
(Manpower Request) vs REST-verb (KPI) and each module keeps its own
convention, no test framework and none should be introduced. Cite the
actual convention from the actual file, not a generic React idiom.

## Layering checklist

Per `CLAUDE.md`'s own architecture: `src/pages/<module>/` → calls
`src/services/<module>/*Api.js` (thin axios wrappers, no business logic) →
backed by a `src/store/*.js` Zustand store → wrapped by a
`src/hooks/use<Resource>.js` hook. For any change, check:

- **Service files** stay thin — a plain object of functions calling
  `axiosInstance`, no business logic leaking in.
- **Store shape** matches the established `{ data, isLoading, isLoaded?,
  error }` pattern, async actions `set()` inside try/catch/finally.
  Reference/lookup stores use the `isLoaded` guard + `refresh*` action
  pattern — don't refetch unconditionally where a sibling store guards.
- **Hooks** select via selectors, auto-fetch in a mount `useEffect`, return
  a flat object — check the hook actually exposes what the page(s) using
  it destructure, not just that it compiles.
- **Routing**: any new page must be registered in **both**
  `src/routes/AppRoutes.jsx` (with the right `permissions` array on
  `ProtectedRoute`) **and** `MainLayout.jsx` (`menuData` + `titleMap`/
  `getPageMeta`) — a page missing either is unreachable in the running app;
  this is a BLOCKER-class finding, not a style note.
- **Errors**: every `catch` routes through `handleApiError(error,
  messageApi)`, not a bespoke handler.
- **Permission/status/ownership gating**: row actions combine
  `hasPermission`/`hasAnyPermission`, allowed-status checks, and ownership
  (`record.user_id === user.id`) inline — confirm a new gated action
  follows the same combination style as its sibling actions on the same
  page, and flag as CRITICAL any permission-gated action with no
  client-side check at all (the backend re-checks, per `useAuth.js`'s own
  documented assumption, but a missing client-side check is still a real
  UX/consistency gap here). Every gate must also include the
  `hasRole('Administrator') ||` bypass (product rule in `CLAUDE.md`) — a
  missing bypass is a finding.
- **Forms**: AntD `Form layout="vertical"`, `Form.List` for repeatable line
  items (row in a `Card`, `MinusCircleOutlined`/dashed `+ Button`,
  list-level "at least one" rule), conditional fields via
  `shouldUpdate`/`noStyle`/`getFieldValue`. Client-side `rules` for
  required fields; server 422s surfaced via `handleApiError`.

## Ant Design v6 API currency

Apply `CLAUDE.md`'s Ant Design v6 note to every new/touched component: check
props against the installed source/`.d.ts` (`@deprecated` markers), not
recalled v4/v5 API. A deprecated prop is MEDIUM.

## What this repo cannot confirm about itself

Any claim about what the backend actually validates, enforces, or returns
is inferred from frontend usage, not confirmed — this repo doesn't contain
the Laravel code. Say so explicitly rather than asserting a backend
behavior as fact; see `internal-contract-review` for the fuller version of
this check.

## Severity and reporting

Use `test-evidence`'s severity scale and reporting shape. A missing route
registration or an unenforced permission gate is BLOCKER/CRITICAL
regardless of how small the diff looks. State the finding, the exact file/
line, the concrete failure scenario, and the smallest repo-consistent fix
— or say you don't have a good targeted one.
