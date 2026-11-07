# Employee Master Data — main list page

Part of the `employee-master-data` skill; read `SKILL.md` first (cross-cutting rules). Read before changing `EmployeeMasterData.jsx`, its toolbar, filters, sorting or bulk actions.

## List Page Toolbar / Bulk Actions

`EmployeeMasterData.jsx`'s header is two rows (one row didn't sum to 24
columns once a permission hid a button):

- **Card `title`**: page title (left) + page-level actions (right, `Space
  wrap`): Refresh, Import, Export, Template, Add Employee (each
  permission-gated). `Row justify="space-between" align="middle" wrap`.
- **Toolbar row** (one wrapping `Space`): search (`Input` + `Button` in
  `Space.Compact`, clearing the box re-fetches), Status filter `Select`
  (All/Active/Inactive), Branch, Rank and Position `Select`s (searchable,
  clearable; Branch and Rank only for the all-branch roles — see below),
  a "Clear filters" button shown only while any filter is set
  (resets every filter, keeps the sort), `ColumnSelector`.
- **Default columns** (`DEFAULT_EMPLOYEE_COLUMNS`): Branch, Emp. Code, Job
  Title Code, Lastname, Firstname, Middlename, Job Description, Status — kept in
  `EMPLOYEE_COLUMNS` order, with Status last there so it stays last after
  `ColumnSelector` changes. The Status column renders a green `success` /
  grey `default` `Tag`, same as the View/Edit card header tag.
- **Status filter** posts `search_status: 'Active' | 'Inactive'`; "All" is
  sent as `undefined` (key omitted) — the backend has no `'All'` case.
  Changing it re-fetches page 1, and it's included in delete refetch
  payloads.
- **Branch / Rank / Position filters** post `search_branch` /
  `search_rank` / `search_position` as the **name** (option value = label)
  — the backend matches `b.name` / `g.name` / `f.name`
  (`employee_master_data.branch_id`/`position_id` and that position's rank,
  not the latest branch assignment); names are unique per Branch/Rank/
  PositionController validation. Cleared = key omitted. All params go
  through `buildParams()`, shared by fetch, refresh and delete refetches.
- **Filter options** come from the list response itself
  (`employeeStore.filterOptions` = `branches`, `positions`, `ranks`), not
  `useBranches`/`usePositions`/`/rank/index`: those need `branch-list`/
  `position-list`/`rank-list`, which almost no `employee-master-data-list`
  role has (Branch/Department Managers, HR roles → 401, empty dropdowns).
- **Who sees which filter**: Branch and Rank are shown only when
  `useListAccess().seesAllBranches` — the user has one of Administrator,
  Employee Master Data Administrator, Recruitment & Hiring, Payroll Admin,
  Employees Relation, Performance Management (exactly the roles
  `getEmployees()` doesn't scope). Scoped users (Branch Manager,
  Department/Division Manager, Section Head) get Status + Position only.
  (`canFilterByBranch`, used by the segment lists, also admits a
  "Department Manager" position — not used here.)
- **Branch Manager's Position options** = their position's subordinate
  positions (`subordinate_position_ids`, from `position_subs` of the
  signed-in user's position — 12 for the "Branch Manager" position), when
  the user has the Branch Manager role and none of the all-branch roles;
  falls back to every position if none are on record. Other scoped roles
  see every position.
- **Rank narrows Position**: with a Rank picked, Position lists only
  positions whose `rank_id` is that rank; picking a rank that excludes the
  selected position clears it in the same request. Clearing Rank keeps the
  position and restores every option.
- **Sorting** is server-side: every column is `sorter: true` with a
  controlled `sortOrder` (key = column `value`); a header click posts
  `sort_field` (the column `value`) + `sort_order` (`ascend`/`descend`),
  back to page 1; the third click clears it (backend default order). The
  backend maps `sort_field` through its own whitelist (join aliases for
  relation columns, real `employee_master_data` columns otherwise) and
  ignores anything else; `id` breaks ties. Empty relation values (`-`) sort
  first ascending. A sort on a column hidden via `ColumnSelector` is
  dropped. Paging and filtering keep the sort. A sort click fires only the
  Table's `onChange` (action `sort`), never `pagination.onChange`.
- **Bulk action bar**: `components/SelectionBar.jsx` (main list and the
  segment lists), shown only when `selectedRowKeys.length > 0` — the count
  and a link-style Clear selection on the left, the bulk actions passed as
  children on the right (wraps under the count on narrow screens; colors
  from the theme token, so dark mode follows): permission-gated Submit
  Branch Report and Delete Selected (`Popconfirm` →
  `deleteEmployee(selectedRowKeys, refetchParams)`). Add any future bulk
  action as a child button (default size).
- Use `App.useApp()` for every `message`/`notification` in this module —
  never the static `antd` import (it can't consume the `<AntApp>` context
  and warns).
