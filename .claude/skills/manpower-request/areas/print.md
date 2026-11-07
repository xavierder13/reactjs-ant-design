# Manpower Request (frontend) — print layout

Part of the `manpower-request` skill; read `SKILL.md` first (cross-cutting rules).

## Print Layout

`ManpowerRequestPrint.jsx` + `.css`, route `/manpower-requests/:id/print`,
permission `manpower-request-print`. Follow `KpiEvaluationPrint.jsx`'s
pattern — don't invent a new print technique:
- A normal page route inside `MainLayout`/`ProtectedRoute`. `@media print`:
  `body:has(.mrf-print) * { visibility: hidden }`, reveal only
  `body:has(.mrf-print) .mrf-print(, *)`, force it to
  `position: absolute; top: 0; left: 0`; paper size is the named
  `@page manpower-request` (set on `body:has(.mrf-print)`). Scoped because
  page CSS is global — see CLAUDE.md "Printing". The on-screen Print button calls
  `window.print()`; `.no-print` hides it when printing.
- Rows use `page-break-inside: avoid`; `thead { display:
  table-header-group }` repeats headers.
- Header logo: `src/assets/addessa-logo.jpg` (extracted from the backend's
  MRF PDF) — reuse it.
- A **filled record**, not the blank template: approval signature lines are
  the real `approval_history` entries. "Reason for Request" prints once for
  the whole request, with the Replacement/Additional/New Position columns
  each itemizing their lines (numbered when more than one) — not once per
  line. "FOR HR USE ONLY" is always the itemized table: one row per (line,
  hire), a line with no hire gets one blank row. Its label stays "Date
  Hired".
- Header uses the branch name; Job Description uses the position name.
- Dates print as `MM/DD/YYYY`. Real paper/PDF pagination is unverified.
