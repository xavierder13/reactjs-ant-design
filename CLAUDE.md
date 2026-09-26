# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Purpose

A ReactJS HRIS (Human Resource Information System) web application. It is the
frontend for a Laravel API backend (not in this repo). Existing modules
include: Authentication, User/Role/Permission management, Employee Master
Data, Recruitment, KPI Management (templates, evaluations, self-evaluations),
and Manpower Request.

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

**Ant Design v6 (installed 6.4.3) — don't trust recalled v4/v5 prop
names.** Known renames: `Divider` `orientation` → `titlePlacement`;
`Alert` `message` → `title` (`message` is `@deprecated` — write
`<Alert title="...">` in new/touched code). Don't confuse that with the
unrelated, non-deprecated `message` from `App.useApp()`. Before using an
AntD prop from memory, check the installed source: `node_modules/antd/es/
<component>/index.js` or its `.d.ts` (`grep -A2 "@deprecated"`). There's no
browser automation here, so console deprecation warnings won't surface on
their own.

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
- **Product rule: the platform `Administrator` role can do every action on
  every feature.** Every action gate needs a `hasRole('Administrator') ||`
  bypass (see MRF's `canEdit`/`canSubmit`); a gate without it is a
  defect.
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
The host shell may have no working `node`/`npm`. Prefer the Docker dev
container when it's running (`docker ps`; service `rbac-dev`, container
`rbac-react-dev`, live bind-mounted):
```
docker exec rbac-react-dev npm run lint
docker exec rbac-react-dev npm run build
```
The repo has pre-existing lint problems — judge only whether *your*
changed files add new ones. ESLint enforces
`react-hooks/set-state-in-effect` as an error, and it traces into
same-component helpers: inside a `useEffect`, call a fetch helper via a
function defined and invoked in the effect (`const load = async () => {
await fetchX(); }; load();`, as in `EditKpiTemplate.jsx`); derive filtered
lists with `useMemo` rather than syncing them into state.
No test framework/suite exists in this project. Do not assume Jest/Vitest
are available; do not add one unless explicitly requested.

## Modules with their own skill

Module-specific detail lives in `.claude/skills/<module>/SKILL.md`, not
here. **Read the module's skill before changing that module's files.**
Dated change history for each lives in `docs/<module>-history.md`.

- **Employee Master Data** (`src/pages/employee_master_data/`, routes
  `/employees…`, `/acknowledgment-reports…`) —
  `.claude/skills/employee-master-data/SKILL.md`. Key traps: no
  single-employee fetch endpoint (View/Edit use router state); server-side
  pagination; tabs render bare `Form.Item`s inside `EmployeeForm`'s single
  `<Form>`; new list columns must pass the backend `$table_fields` check.
- **Manpower Request** (`src/pages/manpower_request/request/`, routes
  `/manpower-requests…`) — `.claude/skills/manpower-request/SKILL.md`.
  Key traps: POST-only API; `fetchById` returns `{ manpower_request,
  approval_status }`; gates combine permission + ownership + status;
  existing attachments must be re-sent on every update.

## Role & Permission

`src/pages/role/` (`RoleIndex.jsx`, shared `RoleForm.jsx` for
`CreateRole`/`EditRole`, AntD `Transfer` for permissions),
`src/pages/permission/PermissionIndex.jsx` (list + create/edit modal, no
separate routes), `roleApi.js`/`permissionApi.js`, `roleStore`/
`permissionStore`, `useRoles`/`usePermissions`. Routes: `/roles`,
`/roles/create`, `/roles/:id/edit`, `/permissions`.
- **Validation failures return HTTP 200, not 422** for
  `RoleController@store/update` and `PermissionController@store/update`.
  Check `data.success`; on failure map the first `{field: [messages]}`
  entry onto the form via `form.setFields`. Don't route these through
  `handleApiError` (it only handles 422).
- `/permission/edit` and `/permission/create` are not used (edit pre-fills
  from the list row; `create` returns a Blade view).
- **Administrator role (id `1`) is read-only**: gate on `record.id === 1`,
  not the name — View-only in the list, `RoleForm` `readOnly` disables
  fields and hides Save. The backend 403 is the real enforcement.
- Permissions: `role-list/-create/-edit/-delete`,
  `permission-list/-create/-edit/-delete`.
- Not built: a separate view-role page; assigning users to roles (belongs
  to the unbuilt User module).

## Keeping Claude's docs current

After building or fixing something, update the owning module skill by
**editing existing statements in place** so it describes the current
state, and delete anything the change made untrue. Don't append dated
"added YYYY-MM-DD / fixed same day" entries to `CLAUDE.md` or a skill —
that narrative belongs in the commit message (and optionally
`docs/<module>-history.md`). Only add to this file for a new repo-wide
convention or a new entry under "Modules with their own skill". A new
non-trivial module gets its own skill rather than a section here.

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
