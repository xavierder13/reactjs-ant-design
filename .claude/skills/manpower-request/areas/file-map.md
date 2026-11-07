# Manpower Request (frontend) — file map and routes

Part of the `manpower-request` skill; read `SKILL.md` first (cross-cutting rules).

## Architecture / File Map

```
src/pages/manpower_request/request/
  ManpowerRequestIndex.jsx    list/table page
  CreateManpowerRequest.jsx   thin wrapper → ManpowerRequestForm mode="create"
  EditManpowerRequest.jsx     fetches record, guards editability, → ManpowerRequestForm mode="edit"
  ManpowerRequestForm.jsx     shared create/edit form (Form.List for position line items)
  EmployeeSelect.jsx          async searchable employee picker (Replacement Employee + Record Hires)
  ViewManpowerRequest.jsx     detail page: record + approve/disapprove/return/cancel/delete,
                              Approval History, Record Hires, per-line attachment controls
  ManpowerRequestPrint.jsx    print view (+ ManpowerRequestPrint.css)

src/store/manpowerRequestStore.js
src/services/manpower_request/manpowerRequestApi.js
src/hooks/useManpowerRequests.js
src/pages/dashboard/DashboardPage.jsx   "Manpower Request — Time to Fill" section
```

## Routes

Registered in both `AppRoutes.jsx` (`permissionRoutes`) and
`MainLayout.jsx` (`menuData` + `getPageMeta` regex cases for `:id` paths):

```
/manpower-requests            → ManpowerRequestIndex     (manpower-request-list OR -list-all)
/manpower-requests/create     → CreateManpowerRequest    (manpower-request-create)
/manpower-requests/:id        → ViewManpowerRequest      (manpower-request-list OR -list-all + action perms)
/manpower-requests/:id/edit   → EditManpowerRequest      (manpower-request-create/-edit)
/manpower-requests/:id/print  → ManpowerRequestPrint     (manpower-request-print)
```

`-list-all` must stay accepted alongside `-list` in `AppRoutes.jsx` and the
"All Requests" `menuData` entry, or a role holding only `-list-all` is
blocked client-side. The print route is opened via `window.open(...,
'_blank')` from a Print button (no `menuData` entry) but has its own
`getPageMeta` case.
