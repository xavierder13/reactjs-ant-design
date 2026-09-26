# Role & Permission module — notes archive

Moved here verbatim on 2026-09-26 from the former "Role & Permission
Conventions" section of `CLAUDE.md`. **Not loaded by Claude by default** —
the current rules are the short "Role & Permission" entry in `CLAUDE.md`.

---


Module status (2026-09-22): **built this session** — `RoleIndex.jsx`/
`PermissionIndex.jsx` were previously literal one-line stub components
(`return "This is a role list page"`) despite `/roles` and `/permissions`
already being registered in `AppRoutes.jsx`/`MainLayout.jsx`. Recreated
from vueportal's embedded Vue2+Vuetify2 reference
(`resources/js/views/role/*.vue`, `resources/js/views/permission/*.vue`,
backed by `RoleController`/`PermissionController` +
`spatie/laravel-permission`) — see that repo's own `CLAUDE.md` for why it
also ships a local Vue frontend for non-HRIS-tagged modules.

- Files: `src/pages/permission/PermissionIndex.jsx` (list + create/edit
  modal, matching the Vue reference's dialog-based Permission page —
  permission is a single-field entity, a full routed page would be
  overkill), `src/pages/role/` — `RoleIndex.jsx` (list),
  `RoleForm.jsx` (shared form used by both `CreateRole.jsx` and
  `EditRole.jsx`, matching the `KpiTemplateForm`
  mode='create'/'edit' shared-component pattern) with an AntD `Transfer`
  for permission assignment in place of the Vue reference's
  filterable-checkbox `v-data-table` — same functionality (search,
  view-only-selected filter), idiomatic AntD component instead of a literal
  port. `src/services/role/roleApi.js`, `src/services/permission/permissionApi.js`,
  `src/store/roleStore.js`/`permissionStore.js`,
  `src/hooks/useRoles.js`/`usePermissions.js`.
- **Registered** in both `AppRoutes.jsx` and `MainLayout.jsx`: `/roles`,
  `/roles/create`, `/roles/:id/edit`, `/permissions` (Permission has no
  create/edit routes — it's modal-only on the list page).
- **Backend quirk — validation failures return HTTP 200, not 422**:
  `RoleController@store/update` and `PermissionController@store/update`
  return `response()->json($validator->errors(), 200)` on validation
  failure (e.g. duplicate name) — confirmed by reading the controllers
  directly, not assumed from the general "422" convention documented
  above. `data.success` (present only on success) is therefore the only
  reliable success/failure signal for these four endpoints — do **not**
  route their errors through `handleApiError` (which branches on
  `error.response.status === 422` and will never fire here). Both
  `PermissionIndex.jsx`'s and `RoleForm.jsx`'s save handlers instead check
  `data.success` and, on failure, map the first `{field: [messages]}` entry
  of the response body onto the AntD form via `form.setFields`.
- **`/permission/edit` and `/permission/create` are not wired** — the Vue
  reference never calls the former (it pre-fills its edit dialog from the
  already-fetched list row instead, which `PermissionIndex.jsx` also
  does), and the latter (`PermissionController@create`) returns a Blade
  view, not JSON, so it can't be called from an API client at all. Also
  observed in passing: `PermissionMaintenance` middleware gates edit on
  `request->is('api/permission/edit/*')` (a wildcard segment) but the
  actual route has no id segment (`POST /permission/edit`, id in the
  body) — looks like a pre-existing backend bug that would 401 that
  endpoint if anything ever called it; out of scope here since nothing
  does, not fixed (frontend-only task, `vueportal` owns that file).
- **Administrator role (id `1`) is read-only**, matching
  `RoleController@update/delete`'s `if ($roleid == 1) return abort(403)`
  guard: `RoleIndex.jsx` hides Edit/Delete and shows a View-only eye icon
  for it instead (gated on `record.id === 1`, not on the role's `name`,
  unlike the Vue reference which compares `item.name == 'Administrator'`
  — the id check is the actual backend rule and doesn't break if the role
  is ever renamed); `RoleForm.jsx` derives `readOnly` the same way and
  disables the name field, the permission `Transfer`, and hides the Save
  button entirely when true. This is frontend-only, same as every other
  such guard in this repo — the backend 403 is still the real
  enforcement.
- Permission strings in use: `role-list`, `role-create`, `role-edit`,
  `role-delete`, `permission-list`, `permission-create`, `permission-edit`,
  `permission-delete` — all pre-existing in `PermissionSeeder.php`, no
  backend changes were needed for this feature.
- **Not yet built / deferred**: no dedicated "view role" page distinct
  from the read-only edit state (matches the Vue reference, which also
  reuses its edit component for viewing); no assign-users-to-role UI (out
  of scope — the Vue reference doesn't have one either, role assignment
  happens on the User module, which is a separate, still-unbuilt page in
  this repo).
