---
name: record-management
description: Recipe for adding a new admin "record management" (CRUD master-data) page to this React HRIS app — API wrapper, Zustand store + hook, list page with modal create/edit, route + menu registration, permission gating — using Area Assignment as the reference implementation. Also the reference for Area Assignment and the Organization pages (Companies, Branches, Departments, Positions, Ranks, Promodizer Brands). Use when asked to build a new record-management/master-data/assignment page, or when changing any of those pages.
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

- **Read-only, not disabled** (user rule): a value the user can't change
  but should read — the employee of a filed record, a value filled from
  another pick (Hiring Officer Position), a locked pattern — is shown
  `readOnly` (Input / InputNumber) or as plain text, never `disabled` (the
  greyed look). `disabled` is only for a control that isn't available yet
  (e.g. Half Day on a multi-day leave). Precedent: MRF's quantity,
  `ReadOnlyDateInput`. When values render as text inside a Form.List, build
  the payload from `form.getFieldValue(...)` — `validateFields()` returns
  only rendered fields.
- **Pagination**: `pagination={tablePagination(10)}` (`src/utils/tablePagination.js`
  — records-per-page selector 10/20/50/100 + "x-y of n records"). Never a
  fixed `pageSize` on a client-side table: it overrides AntD's internal
  state, so the size selector shows but does nothing. Server-paginated
  tables keep their own current/pageSize/onChange. `App.jsx`'s
  ConfigProvider turns the selector on for tables left on AntD's defaults.
- **Row action buttons**: follow the mandatory color coding table in
  `CLAUDE.md` (Table/List Conventions) — View blue (`color="blue"`, not
  `primary`: the theme's primary is green), Edit green, Delete red,
  Cancel/Deactivate orange, Submit cyan, Print/Export purple; icon-only,
  `size="small"`, `Tooltip`. Expand toggle = shared `src/components/ExpandIcon.jsx`.

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
  `listStyle` is `@deprecated` in v6.
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
- **Rich text (HTML) fields**: `src/components/RichTextEditor.jsx` (CKEditor
  5 configured to output CKEditor 4-identical HTML — see the recruitment-ats
  skill) as the `Form.Item` control; treat an empty document as blank before
  required checks (`isBlankHtml` in `CareersPositionFormModal.jsx`). `RichTextEditor.css` restores list indent and
  paragraph/heading spacing inside `.ck-content` — `src/index.css`'s global
  `* { margin: 0; padding: 0 }` reset otherwise puts bullets left of the text.
- **`saveRecord` options**: `success` may be `true` with the message in
  `resp`/`message`; pass `onError` when the backend answers `{ error }`
  (the careers setup pages pass `showGatewayError`).
- **AntD v6 Select search**: `showSearch={{ optionFilterProp: 'label' }}` —
  the top-level `optionFilterProp`/`filterOption`/`onSearch` props are
  `@deprecated` in the installed version (older files still use them).

### Verify before calling it done

`docker exec rbac-react-dev npx eslint <new/changed files>` (judge only your
files — `MainLayout.jsx` and `EmployeeSelect.jsx` carry pre-existing
errors) and `npm run build`. Grep `@deprecated` for every AntD component
you used. Lint/build is not proof the page works — hand off to
`/test-feature` / `/test-workflow`.

## Organization pages (Companies, Branches, Departments, Positions, Ranks, Promodizer Brands)

Replace vueportal's `company/`, `branch/`, `department/`, `position/`,
`rank/`, `promodizer_brand/` `*Index.vue` screens.

- Files: `src/pages/record_management/<entity>/<Entity>Index.jsx` +
  `<Entity>FormModal.jsx`; shared `RecordToolbar.jsx` (search/Refresh/
  Create), `RecordRowActions.jsx` (Edit/Delete), `ActiveTag.jsx`,
  `saveRecord.js`; APIs in `src/services/record_management/` (contract in
  each file's header comment); stores `rankStore`, `companyStore`,
  `promodizerBrandStore`, `branchRecordStore`, `departmentRecordStore`,
  `positionRecordStore` + hooks `useRanks`, `useCompanies`,
  `usePromodizerBrands`, `useBranchRecords`, `useDepartmentRecords`,
  `usePositionRecords` (Area shape; also hold the form options the same
  `index` response returns — companies, divisions, ranks/branches/departments).
- The `*RecordStore`s are separate from the cached dropdown lookups
  (`branchStore`/`departmentStore`/`positionStore`, `isLoaded`-guarded);
  every save/delete sets the matching lookup's `isLoaded: false` (Company
  → branch lookup too; Branch/Department/Position also mark
  `employeeFormOptionsStore` stale) so the next page refetches.
- Routes `/companies`, `/branches`, `/departments`, `/positions`, `/ranks`,
  `/promodizer-brands`, each gated `<entity>-list`; actions gated
  `<entity>-create/-edit/-delete` + Administrator bypass (Promodizer Brand
  permissions are Administrator-only in the seeded roles).
- Menu: Set Up & Authorizations → **Organization** (first), with item
  groups *Structure* (Companies, Branches, Departments — parent before
  child), *Job Structure* (Positions, Ranks), *Employee Lookups*
  (Promodizer Brands). Breadcrumbs follow the same path.
- Backend: GET `index`, POST `store`, `update/{id}`, `delete` (id in the
  body as `<entity>_id`). Edit pre-fills from the list row — the backend's
  POST `/edit` is unreachable (middleware checks `edit/*`). Validation
  failures are **HTTP 200** error bags → `saveRecord.js` maps them onto
  fields (`fieldFor` for Position's `branchRequirement.<i>.quantity`) and
  toasts the first; an entry with no message (duplicate department name
  returns `{ department: [] }`) gets a generic one.
- Backend quirks the pages work around: Promodizer Brand update saves
  `promodizer_brand`, not the validated `brand` → `update()` sends both
  (vueportal's own Vue edit blanks the brand). Department's division rule
  is keyed `division` and malformed (`required.integer`) → never send a
  `division` key; division is required client-side only. Company and
  Department `active` is a NOT NULL `'Y'`/`'N'` → always sent (Switch).
- Position modal: tabs Details (name, rank, cost center from the fixed
  `HQ-Management`/`BR-Officer`/`BR-Rank & File` list, department — all
  required), Required Employees per Branch (every branch, quantity ≥ 0,
  default 0, searchable — values read with `getFieldsValue(true)` because
  filtered-out rows are unmounted) and Subordinates (`Transfer`, self
  excluded; update replaces the set). Tabs are `forceRender`; a failed
  validation jumps to the tab with the first error. List shows total
  required headcount and subordinate count; expand → subordinate and
  per-branch tags.
- Delete has no in-use guard on the backend (no FKs, except a position
  referenced by KPI templates/evaluations → 500); the Popconfirm says what
  will show blank (Company shows its branch count).

## Holiday Calendar (`/holiday-calendar`)

- Replaces vueportal's `calendar/HolidayCalendar.vue`. Files:
  `src/pages/record_management/holiday_calendar/` (`HolidayCalendarIndex.jsx`,
  `HolidayCalendarFormModal.jsx`, `holidayTypes.js`), `holidayCalendarApi.js`
  (contract in its header), `holidayCalendarStore.js`, `useHolidayCalendars.js`.
  Menu Human Resource → Holiday Calendar (`holiday-calendar-list`); actions
  `holiday-calendar-create/-edit/-delete` + Administrator bypass.
- Views: **Calendar** (AntD `Calendar`, `cellRender`; click a day = create
  on that date, click a holiday = edit; year view shows a count per month)
  and **List** (the selected year). Shared filters: year, type, branch,
  title search, Active / incl. inactive.
- Types keep the stored values `Regular` / `Special` / `Working` / `Local`
  (the Vue page uses them too), shown as Regular Holiday / Special
  Non-Working Day / Special Working Day / Local Holiday with the DOLE pay
  rule as form help text (`holidayTypes.js`; nothing computes pay).
- Branches: `Transfer` + "All branches" / "Clear". A national type
  pre-selects every branch on create; Local starts empty. One row per
  branch (`holiday_calendar_branches`), so "All branches" in the list means
  every *current* branch — a branch created later is not included in
  existing holidays.
- Backend (HTTP 200 error bags → `saveRecord`, `branches.N` keys mapped to
  the `branches` field): `branches` required (≥ 1, existing; repeated ids allowed — update keeps
  one row per branch and removes duplicates older updates left),
  `holiday_type` in the four values. Inactive (`status` 0) keeps the record;
  the delete confirm suggests it. The routes `import` and
  `template/download` have no controller methods (not wired).

## Approvals — Access Charts & Approving Officers

- Set Up & Authorizations → **Approvals**: Access Charts (`/access-charts`)
  and Approving Officers (`/approving-officers`), both `access-chart-list`.
  Replace vueportal's `access_chart/AccessChartIndex.vue`. Files
  `src/pages/approval/`, `accessChartApi.js` (contract in its header),
  `accessChartStore` + `useAccessCharts` (one GET `/access_chart/index`
  feeds both pages: charts, modules, users).
- Access Charts: one row per approval procedure (name, module, levels with
  approvals needed and officer count); create / edit = name, module, levels
  in order with approvals needed (Form.List; only the last level can be
  removed; a warning when a removed level still has officers). No expand
  row (user preference): the row's **Approving Officers** action (green,
  `UsergroupAddOutlined`) opens `ApprovingOfficersModal` — per level the
  officers (closable tag → Popconfirm → remove; `access-chart-delete`) and
  an add select (`access-chart-create`); saves at once and refetches.
- Approving Officers: the same maps regrouped per user (the "what does this
  person approve" view) with assign (user → chart → level) and remove.
- Charts the HRIS finds **by name** (`approvalHelpers.SYSTEM_CHARTS`: Manpower
  Request, MRF - *, Leave Application, Manual Time Entry) show an "HRIS" tag,
  can't be deleted, and their name is read-only.
- Backend fixes made for this page (shared with the Vue screen): update
  removes levels left out and syncs `max_approval_level`; delete removes the
  chart's levels too; adding the same user twice at a level is refused.
  Validation failures are HTTP 200 bags (`saveRecord`).
- `ApproversFromMrfSeeder` (vueportal) copied the "MRF - Additional"
  approvers into Leave Application and Manual Time Entry (level 1 managers,
  1 approval; level 2 HR) and gave them the approver roles — additive.

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
  backend validates exists (several accounts may link the same employee —
  user rule, 2026-10-09), and only changes the
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
