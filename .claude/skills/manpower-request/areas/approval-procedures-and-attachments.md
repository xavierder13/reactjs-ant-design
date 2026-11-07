# Manpower Request (frontend) — approval procedures and line attachments

Part of the `manpower-request` skill; read `SKILL.md` first (cross-cutting rules).

## Approval procedures (backend-configured)

Each MRF type has its own approval procedure — Access Charts `MRF -
Replacement` / `MRF - Additional` / `MRF - New Position` (module Manpower
Request), maintained on vueportal's existing Access Chart screen, not in
this app. Level 1 of Additional/New Position is filtered by position
hierarchy (approvers only get MRFs for positions under them).
An MRF holds **one** request type — `ManpowerRequestForm.jsx`'s `details`
list validator rejects mixed types (the backend does too). Full rules:
vueportal `manpower-request` skill → "Approval procedure".

- **Branch Manager requestor**: `create` returns `branch_level_only` +
  `branch_level_cost_center` (stored in `manpowerRequestStore`);
  `ManpowerRequestForm.jsx` then offers only positions with that
  `cost_center`. The backend enforces it on store/update/submit.
- **Level-1 approver requestor**: `create` returns `hierarchy_position_ids`
  (`{ Additional: [ids], 'New Position': [ids] }` for the types whose level 1
  the user approves; missing type = any position), stored as
  `hierarchyPositionIds`. Each line's Position select re-filters when its
  request type changes, and a validator flags a picked position outside the
  list. The backend enforces it too, and auto-approves level 1 on submit for
  such requestors (see vueportal's skill) — nothing to do on this side.
- `approval_status` also carries `procedure_type` and `max_level` (levels
  this MRF needs); `levels` already lists only those.

## Line attachments (View page)

`ViewManpowerRequest.jsx` also has a post-save attach/replace/remove/
download control per line (`detailFileUpload`/`detailFileDownload`/
`detailFileDelete`). Upload/delete gated on `canEdit`; download has no
extra gate. The backend only allows upload/delete in editable statuses.
