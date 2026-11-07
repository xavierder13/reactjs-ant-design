# Employee Master Data — import, export and templates

Part of the `employee-master-data` skill; read `SKILL.md` first (cross-cutting rules). Read before changing Generate Template / Import Data / Export.

## Export / Template Download

- Export sends `report_type: 'Employee List'` (the backend endpoint is a
  4-way report dispatcher).
- **Bulk create/update = Generate Template → fill → Import Data**, the
  user's standard for data updates (vueportal TemplateDownloadDialog.vue /
  ImportDialog.vue). `importDocumentTypes.js` lists the types both modals
  offer: Employee Master Data, Branch Assignment Position, Monthly Key
  Performance, Issued NTE, Disciplinary Action, Offboarding, Work Schedule.
  Template options follow Vue: Document Status (All/Active/Inactive —
  backends honour Active/Inactive, plus the old 'Active Only') and
  Branch/Position (0 = ALL, for the HR roles in `BRANCH_POSITION_ROLES`) for
  Branch Assignment and Monthly Key Performance; Year + Month for Monthly
  Key Performance. Import handles `success`, `error_column`, `error_row_data`
  + `field_values`, `collection_diff`, `duplicate_records`, `error_empty`
  and `error`. Classroom / OJT Performance Rating are left out: their
  controllers have no import()/template_download() (broken in Vue too). The dispatcher's
  'Branch Manpower Report' is **not** used here — see Branch Manpower
  Fill Rate below.
- `ExportEmployeesModal.jsx` mirrors `ExportDialog.vue`: Branch picker only
  for `hasAnyRole('Administrator', 'Employee Master Data Administrator',
  'Recruitment & Hiring', 'Payroll Admin', 'Employees Relation',
  'Performance Management')` (others omit `branch_id`; scoped server-side);
  Date Field Parameter (Date Employed / Date Assigned-Deployed / Date
  Resigned); Document Status (All / Active Only) **hidden** when Date
  Resigned; one `RangePicker`; no future-date restriction.
- `template_download` returns **HTTP 200 with a JSON error body** on
  failure. Always download blobs via `src/utils/downloadBlobResponse.js`,
  which checks `Content-Type` and surfaces the JSON error instead of saving
  a corrupt file. Known gap: non-200 blob errors still show a generic
  message (shared `handleApiError` doesn't parse Blob bodies) — left alone.
