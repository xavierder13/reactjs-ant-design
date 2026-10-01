---
name: record-management
description: Recipe for adding a new admin "record management" (CRUD master-data) page to this React HRIS app — API wrapper, Zustand store + hook, list page with modal create/edit, route + menu registration, permission gating — using Area Assignment as the reference implementation. Also the reference for the Area Assignment page itself. Use when asked to build a new record-management/master-data/assignment page, or when changing Area Assignment.
---

# Record management pages (frontend)

A "record management" page = admin-maintained master data (list +
create/edit/delete, optional mappings to branches/employees/…), no
approval workflow. Repo-wide rules are in `CLAUDE.md`; this is the concrete
recipe. **Area Assignment is the reference implementation — copy its
files.** The backend is vueportal (its own `record-management` skill).

## Recipe (copy from Area)

| Piece | Area file | Notes |
|---|---|---|
| API wrapper | `src/services/area/areaApi.js` | POST-only, matching the backend module. Comment the response shapes at the top (confirmed from the controller, not guessed). |
| Store + hook | `src/store/areaStore.js`, `src/hooks/useAreas.js` | `{ items, isLoading, error, fetchItems }`; hook auto-fetches with `useEffect(() => { fetchItems(); }, [fetchItems])` and returns `refetch`. |
| List page | `src/pages/area/AreaIndex.jsx` | `App.useApp()` messages (new-page convention). Search box filters in memory via `useMemo`. Table `rowKey`, `size='small'`, `pagination={{ pageSize: 10, showSizeChanger: true }}`, expandable rows for mapped records. Delete in `Popconfirm`. |
| Create/edit modal | `src/pages/area/AreaFormModal.jsx` | One component for both (`area` null = create). `destroyOnHidden` + **populate/reset in `afterOpenChange`**, never in the open handler (see `CLAUDE.md` Form conventions). Form options loaded from the module's own `create` endpoint on open. Errors → `handleApiError`. |
| Route | `src/routes/AppRoutes.jsx` `permissionRoutes` | `{ permissions: ['<module>-list'], path, element }`. |
| Menu + title | `src/layouts/MainLayout.jsx` `menuData` + `titleMap` | Both are required or the page is unreachable/untitled. |

### Patterns worth reusing verbatim

- **Row action buttons**: follow the mandatory color coding table in
  `CLAUDE.md` (Table/List Conventions) — View blue (`color="blue"`, not
  `primary`: the theme's primary is green), Edit green, Delete red,
  Cancel/Deactivate orange, Submit cyan, Print/Export purple; icon-only,
  `size="small"`, `Tooltip`. Expand toggle = chevron `expandIcon`.

- **Permission gates**: `const isAdmin = hasRole('Administrator');
  const canEdit = isAdmin || hasPermission('<module>-edit');` — the
  Administrator bypass is a product rule; a gate without it is a defect.
  The backend re-checks everything.
- **Picking many items from a fixed list** (branches into an area): use
  AntD `Transfer` (Available ⇄ Assigned, per-side search, fixed height),
  not `Select mode="multiple"` — the Select grows a new row of tags per
  few picks. Same control as Role's permission assignment. Wire it in a
  `Form.Item` with `valuePropName='targetKeys'` and a
  `{ required: true, type: 'array', min: 1 }` rule; size it with
  `styles={{ section: { width: 'calc(50% - 20px)', height: 340 } }}` —
  `listStyle` (what `RoleForm.jsx` still uses) is `@deprecated` in v6.
  Numeric keys are fine (`TransferKey = React.Key`), so ids stay ints in
  the payload.
- **"One parent per option"** (a branch in one area): the options endpoint
  returns each option's current owner; keep those items listed but
  `disabled`, rendered with the owner name (`AreaFormModal.jsx`
  `branchItems`). The backend still enforces it.
- **Employee pickers**: reuse `src/pages/manpower_request/request/EmployeeSelect.jsx`
  (single select; don't build a new one), `activeOnly` if only active
  employees may be picked. The backend's `option_list` allow-list must
  include the module's `-create`/`-edit` permissions.
- **Assigning a person to many records** (an HR head to areas): assign
  **from the person's side** — pick the employee, then a
  `Select mode='multiple'` of records with `maxTagCount='responsive'`
  (stays one line) — rather than picking people inside each record's
  form (user preference, 2026-09-28). One replace-all endpoint per person;
  when a person who already has assignments is picked, pre-fill their
  current set (`AssignAreasModal.jsx` `areaAssignments`) so saving doesn't
  silently drop them.
- **Second view over the same data** instead of another endpoint: Area's
  "HR Heads" tab regroups `/area/index` by employee with `useMemo`
  (the "what is this employee assigned to" view).
- **AntD v6 Select search**: `showSearch={{ optionFilterProp: 'label' }}` —
  the top-level `optionFilterProp`/`filterOption`/`onSearch` props are
  `@deprecated` in the installed version (older files still use them).

### Verify before calling it done

`docker exec rbac-react-dev npx eslint <new/changed files>` (judge only your
files — `MainLayout.jsx` and `EmployeeSelect.jsx` carry pre-existing
errors) and `npm run build`. Grep `@deprecated` for every AntD component
you used. Lint/build is not proof the page works — hand off to
`/test-feature` / `/test-workflow`.

## User Accounts (`/users`)

- `src/pages/user/UserIndex.jsx` + `UserFormModal.jsx` + `RolePermissionsModal.jsx`, `userApi.js`,
  `userStore.js`, `useUsers.js`; menu User Management → User Accounts
  (`user-list`). Replaces vueportal's `user/UserIndex.vue`.
- List: search (name/e-mail/branch/position/employee/role), Status/Branch/Role
  filters, Employee column (linked record, Inactive tag), role tags (first 2 + "+N more"), Last Login. Clicking the role
  tags opens `RolePermissionsModal.jsx`: that user's permissions grouped by
  role (collapsible panels, per-role count, unique-permission total,
  search by role or permission) from the `/user/index` row — no fetch.
  The Administrator account (id 1) has no Edit/Delete.
- Modal (create/edit): name, e-mail (locked on edit — the backend ignores
  it), password + confirm (edit: blank = keep; only sent when typed),
  branch (required), position, Active switch (`'Y'`/`'N'`; login blocks
  only `'N'`, legacy rows hold `''`/`'1'` = active), roles via `Transfer`
  keyed by role **name** (Spatie `assignRole`); update replaces all roles.
  Employee Record = `users.employee_id` via `EmployeeSelect` (all
  employees, inactive tagged; `initialOption` labels the saved one). The
  backend validates exists + one account per employee, and only changes the
  link when `employee_id` is sent (vueportal's Vue form doesn't send it).
  `/user/index`, store and update return `employee` ({ id, employee_code,
  first_name, last_name, active } or null) — label via `userEmployee.js`.
  The link drives `/user/profile` (see employee-master-data's Employee
  Profile). `option_list` admits `user-create`/`user-edit` for the picker.
  Editing your own account re-applies `user_roles`/`user_permissions` to
  the auth store.
- Deviations from the Area recipe: form options come from `/user/index`
  (roles, branches, positions) — `/user/create` needs `user-create`, which
  an editor may lack. Validation errors are **HTTP 200** error bags (like
  Role) → check `data.success`, map entries with `form.setFields`.
- `handleAfterOpenChange` calls `form.resetFields()` first on every open:
  the form store outlives `destroyOnHidden` content, and a password typed in
  a cancelled Create otherwise rides into the next Edit and changes that
  user's password.
- Permissions: `user-list`, `user-create`, `user-edit`, `user-delete`.

## Area Assignment (reference page)

- Route `/areas` (`area-list`), menu Human Resource → Area Assignment,
  title "Area Assignment".
- `AreaIndex.jsx`: search (area code/name, branch, employee) + Refresh +
  Create Area; tabs **Areas** (code, name, branch count, HR head tags —
  "(Inactive)" when the employee left; expand → description + branch tags;
  edit/delete actions) and **HR Heads** (one row per assigned employee:
  code, name, position, home branch, status, area tags, branches covered;
  expand → branches per area; Edit Areas / Unassign actions).
- `AreaFormModal.jsx` (width 820): code, name, description, branches
  (`Transfer`, required, search by name/code/area, taken ones disabled
  with their area name). No HR heads here.
- `AssignAreasModal.jsx`: opened from **Assign Areas** (top bar, disabled
  until an area exists) or a HR Heads row's Edit. New: `EmployeeSelect`
  (active only, required) + areas multi-select (required); picking an
  employee pre-fills their current areas. Edit: employee shown as text,
  areas may be emptied (= unassign). Row **Unassign** Popconfirm sends
  `[]`. Gated `canEdit` (`area-edit`).
- Permissions: `area-list`, `area-create`, `area-edit`, `area-delete`.
- Backend contract: `areaApi.js` header comment; full detail in
  vueportal's `record-management` skill.
