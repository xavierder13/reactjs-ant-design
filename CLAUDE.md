# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Purpose

A ReactJS HRIS (Human Resource Information System) web application. It is the
frontend for a Laravel API backend (not in this repo). Existing modules
include: Authentication, User/Role/Permission management, Employee Master
Data, Recruitment, KPI Management (templates, evaluations, self-evaluations),
and Manpower Request (in progress).

## Tech Stack

- React 19 + Vite (`type: module`)
- Ant Design v6 (`antd`, `@ant-design/icons`)
- react-router-dom v7
- Zustand v5 for state management
- axios for HTTP
- dayjs for dates
- chart.js / react-chartjs-2 for charts
- @hello-pangea/dnd for drag-and-drop
- ESLint (flat config) — no Prettier config present
- No test framework is configured in this project

## Project Architecture

This is an **existing production-oriented project**. Preserve existing
conventions; do not refactor or modernize unless explicitly asked.

Backend assumptions inferred from frontend code:
- Laravel API, JSON responses, `Accept: application/json` required
- Bearer token auth (`Authorization: Bearer <token>`)
- 422 responses used for validation errors (field-keyed or `{ message }`)
- Some modules use POST-only endpoints for all actions (Manpower Request),
  others use proper REST verbs (KPI). Follow whichever convention the
  specific module you're touching already uses — do not unify them.

## Important Directories

```
src/pages/<module>/...        Route-level pages, grouped by module
src/services/<module>/*Api.js Thin axios wrappers, one object per resource
src/store/*.js                One Zustand store per resource/domain
src/hooks/use*.js             Thin hook wrapping a store + auto-fetch effect
src/routes/                   AppRoutes.jsx, ProtectedRoute.jsx, GuestRoute.jsx
src/layouts/MainLayout.jsx    Sidebar menu, breadcrumbs, page titles
src/utils/                    handleApiError.js, tokenHelper.js
src/api/axiosInstance.js      Shared axios instance + interceptors
```

## Routing Conventions

- All routes are declared in `src/routes/AppRoutes.jsx`.
- Permission-gated pages go in the `permissionRoutes` array as
  `{ permissions: [...], path, element }` and are rendered through
  `<ProtectedRoute permissions={...}>` + `<MainLayout>`.
- `ProtectedRoute` redirects to `/login` if no token, shows a `Spin` while
  loading `/auth/init`, and redirects to `/unauthorize` if the user lacks
  any of the required permissions.
- `GuestRoute` redirects authenticated users away from guest-only pages
  (e.g. `/login`).
- Every real page must also be added to `MainLayout.jsx`:
  - `menuData` — sidebar entry with `permissions`
  - `titleMap` (or a regex case in `getPageMeta`) — page title + breadcrumb
- A page that exists under `src/pages` but is not registered in both
  `AppRoutes.jsx` and `MainLayout.jsx` is **not reachable in the app**.

## State Management Conventions (Zustand)

- One store per resource/domain in `src/store/`.
- Typical shape: `{ data, isLoading, isLoaded?, error }` plus async actions
  that `set()` inside try/catch/finally.
- Reference/lookup data stores (e.g. positions, branches) use an `isLoaded`
  guard so they only fetch once; expose a `refresh*` action that resets
  `isLoaded` and refetches.
- A matching `src/hooks/use<Resource>.js` hook wraps the store: selects
  state via selectors, auto-fetches in a `useEffect` on mount, returns a
  flat object.

## API/Service Conventions

- One file per resource in `src/services/<module>/<name>Api.js`, exporting
  a plain object of functions that call `axiosInstance` — no business logic.
- All requests go through the shared `axiosInstance` (`src/api/axiosInstance.js`),
  which attaches the bearer token and sets JSON headers.
- Handle errors with the shared `handleApiError(error, messageApi)` util in
  every `catch` block — it distinguishes 422 validation errors, AntD form
  validation errors, and generic failures.

## Authentication and Authorization Conventions

- `src/store/authStore.js` holds `user`, `roles`, `permissions`,
  `isAuthenticated`, `isLoaded`. Populated once via `GET /auth/init` in
  `ProtectedRoute`.
- `src/hooks/useAuth.js` exposes `hasRole`, `hasAnyRole`, `hasPermission`,
  `hasAnyPermission` — always check permissions client-side with these
  helpers; the backend is the source of truth and re-checks server-side.
- Tokens live in `localStorage` via `src/utils/tokenHelper.js`
  (`access_token`, `refresh_token`).
- Note: the 401 handling in `axiosInstance`'s response interceptor is
  currently commented out (no auto-redirect/clear on 401).

## Form and Validation Conventions

- AntD `Form` with `layout="vertical"`, one `Form` per page/feature.
- Repeatable line items use `Form.List` (e.g. Manpower Request position
  requirements, KPI template items): each row wrapped in a small `Card`,
  `MinusCircleOutlined` to remove a row, a dashed block `Button` with
  `PlusOutlined` to add one, and a list-level validator via `rules` on
  `Form.List` for "at least one item required".
- Conditional fields use `Form.Item` with `shouldUpdate`/`noStyle` plus
  `getFieldValue` (see the "Replacement Employee" field in
  `ManpowerRequestForm.jsx`).
- Async searchable pickers follow the `EmployeeSelect.jsx` pattern:
  controlled `value`/`onChange`, `onSearch` for server-side filtering,
  `onPopupScroll` for infinite-scroll pagination.
- Client-side `rules={[{ required: true, message: '...' }]}` for required
  fields; server-side 422 errors are surfaced via `handleApiError`.

## Table/List Conventions

- AntD `Table` with `rowKey="id"`, `loading={isLoading}`,
  `pagination={{ pageSize: 10, showSizeChanger: true }}`.
- Client-side filtering (search text, status, date range) is done in-memory
  over the store's `items` array, not via server query params.
- Status columns render an AntD `Tag` colored via a local
  `STATUS_COLORS`/`statusColors` map keyed by status string.
- Row actions are permission- and status-gated inline functions
  (e.g. `canEdit(record)`, `canSubmit(record)`, `canCancel(record)`)
  combining `hasPermission`/`hasAnyPermission`, allowed statuses, and
  ownership checks (`record.user_id === user.id`).
- Mutating actions (submit/cancel/approve/reject) are wrapped in
  `Popconfirm` before calling the API.

## Error / Loading / Notification Conventions

- Loading: AntD `Spin` for full-page/blocking loads; `loading` prop on
  `Table`/`Button` for scoped loading states.
- Errors: always route through `handleApiError(error, messageApi)`.
- Notifications: **two patterns currently coexist in the codebase** —
  - `const [messageApi, contextHolder] = message.useMessage()` (older,
    used in Manpower Request pages)
  - `const { message } = App.useApp()` (newer, used in KPI evaluation pages)
  When adding to an existing page, match that page's existing pattern.
  When starting a new page, prefer `App.useApp()` unless told otherwise.

## Important Development Commands

```
npm run dev       # start Vite dev server
npm run build     # production build
npm run preview   # preview a production build
```

## Testing / Lint / Build Commands

```
npm run lint       # ESLint (flat config, react-hooks + react-refresh rules)
```
No test framework/suite exists in this project. Do not assume Jest/Vitest
are available; do not add one unless explicitly requested.

## Manpower Request Conventions

Module status: **in progress, not fully wired up.**

- Files: `src/pages/manpower_request/request/` (Index, Create, Edit, Form,
  EmployeeSelect, and `ViewManpowerRequest.jsx` which is currently an
  **empty file**), `src/store/manpowerRequestStore.js`,
  `src/services/manpower_request/manpowerRequestApi.js`.
- **Not registered in `AppRoutes.jsx` or `MainLayout.jsx`** — the pages
  exist but their routes (`/manpower-requests`, `/manpower-requests/:id`,
  `/manpower-requests/create`, `/manpower-requests/:id/edit`) are not
  currently reachable in the running app.
- All service endpoints are POST-only (`/manpower_request/index`,
  `/create`, `/edit/{id}`, `/store`, `/update/{id}`, `/submit/{id}`,
  `/approve/{id}`, `/reject/{id}`, `/return/{id}`, `/cancel/{id}`,
  `/approval_history/{id}`) — follow this POST convention for any new
  Manpower Request endpoint, do not switch to REST verbs.
- Status flow: `Draft → Submitted/Pending Approval → Approved | Rejected |
  Returned`, with `Cancelled` as a terminal branch from most non-final
  states. `current_level` on the record suggests multi-level approval.
- `fetchById` in the store returns `{ manpower_request, approval_status }`.
- Edit is restricted to `Draft`/`Returned` status and to the record owner
  (`record.user_id === user.id`) — enforced in the UI, mirror this check
  in any new MRF page.
- The `approve`, `reject`, `return`, and `approvalHistory` API methods
  already exist in `manpowerRequestApi.js` but have no UI consumer yet —
  this is expected to land in `ViewManpowerRequest.jsx`. Use
  `KpiEvaluationView.jsx` as the closest existing pattern for a detail
  page with approve/reject/status actions (Popconfirm for simple
  transitions, a Modal + reason textarea for reject/return).
- Permission strings used so far: `manpower-request-create`,
  `manpower-request-edit`, `manpower-request-cancel`. Not yet confirmed
  whether these are seeded on the backend; verify before relying on a new
  permission string.

## Important Rules for Modifying This Existing Project

- This is an existing, production-oriented codebase — preserve existing
  conventions and file/folder patterns rather than introducing new ones.
- Do not add new dependencies when an existing one already solves the
  problem (AntD, dayjs, zustand, axios cover most needs here).
- Do not unify the POST-only vs REST-verb API style differences between
  modules unless explicitly asked — each module currently matches its own
  backend controller conventions.
- Before implementing a new page/feature, check whether it needs to be
  registered in both `AppRoutes.jsx` (`permissionRoutes`) and
  `MainLayout.jsx` (`menuData` + `titleMap`/`getPageMeta`) — a page file
  alone is not enough to make it reachable.
- No test suite exists; do not claim tests pass or add test infrastructure
  without being asked. Verify changes via `npm run lint` and manual/dev
  server checks.
- Prefer the smallest change that follows an existing pattern over a new
  abstraction.
- Never expose, print, log, commit, or paste into a response any critical
  credential — API tokens, access/refresh tokens, passwords, `.env` secret
  values, database credentials, or third-party service/plugin API keys
  (payment gateways, cloud providers, etc.). Treat `.env` and any
  credential-bearing config file as sensitive: reading it to confirm a
  non-secret value (e.g. `VITE_API_BASE_URL`) is fine, but do not echo
  actual secret values back, write them into code, commit them, or include
  them in explanations/logs. If a task seems to require exposing a real
  credential, stop and ask the user first.
