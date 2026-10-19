---
name: company-asset
description: Company Assets page (non-IT company property) — registry, add / edit, assign / return to an employee or area, assignment history, maintenance log, disposal; on vueportal's Company Asset module. Use for src/pages/company_asset/ or the /company_asset endpoints from React.
---

# Company Assets (React)

Backend: vueportal `CompanyAssetController` + `CompanyAssetService`,
`CompanyAssetMaintenance`, prefix `company_asset` — module rules (asset tag,
depreciation, disposal lock, history-as-audit-trail) are in vueportal's
`company-asset` skill. API contract: header of
`src/services/company_asset/companyAssetApi.js`. Old-style envelope:
`success` is a message string; errors are 422 (field bag or `{ message }`).
`create` (form options) is **GET**; everything else POST.

## Page (`/company-assets`, Human Resource → Company Assets, `company-asset-list`)

- `CompanyAssetIndex.jsx` — server-side search (tag / name / serial),
  filters (category, status, assigned to employee / area, branch),
  `items_per_page` pagination. Row actions: View, Edit (`-edit`, not
  disposed), Delete (`-delete`; history and logs go with it).
- `AssetFormModal.jsx` — add / edit details. Category is typed or picked
  (`AutoComplete`; a new name is created). Status: Active / Under Repair /
  Lost only — **Disposed only through Dispose**. Add may assign at once
  (`-assign`; "Not assigned" sends `assignment_type: null`). Edit never
  sends assignment keys, so it never changes the assignment.
- `AssetDetailsModal.jsx` — details + book value (straight-line; blank
  without date acquired, cost and useful life), tabs Assignment History
  (newest first, Current = open row) and Maintenance Log (`-maintenance`;
  append-only add form, hidden once disposed). Footer: Assign / Reassign,
  Return (Popconfirm), Dispose — `-assign` / `-dispose`, not on a disposed
  asset. Reloads itself after an Assign / Dispose (`reloadKey`).
- `AssetAssignModal.jsx` + `AssignmentFields.jsx` — Employee (picker
  `AssetEmployeeSelect`, the module's own `employee_options`, active only;
  branch / department come from the employee) or Area (location required,
  optional branch / department). `assignmentPayload()` in
  `companyAssetHelpers.js` always sends every key (null when not relevant).
- `AssetDisposeModal.jsx` — reason (required) + approved-by name (note
  only); unassigns and locks the asset.

Admin bypass: the page computes `can.*` as Administrator or the
`company-asset-*` permission (the backend middleware has no role bypass;
Administrator holds every permission).

## Used elsewhere

Clearance (Admin / Property, `asset_source` Company Assets) lists an
employee's assigned assets and blocks the sign-off until each is returned
here or charged on the clearance.

## Verification (2026-10-19)

27 HTTP checks with the React payloads (add with / without assignment,
validation, edit keeps assignment, Disposed refused in edit, area /
employee assign, return twice, history, maintenance, dispose + lock,
filters, picker, delete) and a headless-Edge walkthrough (add → view →
assign to area → maintenance entry → return).
