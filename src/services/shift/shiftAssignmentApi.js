import axios from '../../api/axiosInstance';

// Temporary shifting (relieving) — vueportal ShiftAssignmentController,
// prefix `shift_assignment`. No approval: users with the permission change
// it directly. A shifting overrides the employee's Work Schedule (the fixed,
// memo-based schedule) from date_from to date_to; every create / update /
// cancel keeps a revision with the full state (shift pattern included).
// Scope: shift-assignment-list-all = every employee; otherwise the user's
// direct subordinates (position_subs), own branch outside ADMINISTRATION.
// - getAll(params) → { assignments: paginator } — params: page, per_page,
//   status (Active|Cancelled), shift_id, branch_id, employee_id, date_from /
//   date_to (overlapping), search. Row: { id, employee_id, shift_id,
//   date_from, date_to, reason, relieved_employee_id, status, created_by,
//   cancelled_at, cancel_reason, created_at, employee { employee_code,
//   full_name, branch, position }, relieved_employee, shift { code, name },
//   creator { name } }.
// - options() → { shifts: active shifts with days, branches, all, employees
//   (the user's subordinates when not `all`) }.
// - preview({ employee_id, shift_id, date_from, date_to, assignment_id? })
//   → { current: [per date: { date, day, source ('shift'|'work_schedule'|
//   null), shift_code, day_off, time_in, time_out }], error, warnings }.
// - create(payload) / update(id, payload + remarks) — payload { employee_id
//   (create only), shift_id, date_from, date_to, reason,
//   relieved_employee_id } → { message, assignment }; 422 bag or
//   { message }; 403 outside the user's scope.
// - Bulk (shift-assignment-create): candidates({ branch_id, position_id,
//   search }) → { employees (active, in scope, ≤ 1000), needs_filter (true
//   for users who manage everyone and gave no branch / search) };
//   bulkPreview({ employee_ids, shift_id, date_from, date_to }) → { errors:
//   { employee_id: message }, warnings }; bulkStore(+ reason) → { message,
//   count } or 422 { message, errors } — all or nothing.
// - cancel(id, reason) (reason required) · history(id) → { revisions:
//   [{ action, snapshot, remarks, changer { name }, created_at }] }.
const shiftAssignmentApi = {
  getAll:  (params)      => axios.post('/shift_assignment/index', params),
  options: ()            => axios.post('/shift_assignment/options'),
  preview: (payload)     => axios.post('/shift_assignment/preview', payload),
  create:  (payload)     => axios.post('/shift_assignment/store', payload),
  update:  (id, payload) => axios.post(`/shift_assignment/update/${id}`, payload),
  cancel:  (id, reason)  => axios.post(`/shift_assignment/cancel/${id}`, { reason }),
  history: (id)          => axios.post(`/shift_assignment/history/${id}`),
  candidates:  (params)  => axios.post('/shift_assignment/candidates', params),
  bulkPreview: (payload) => axios.post('/shift_assignment/bulk_preview', payload),
  bulkStore:   (payload) => axios.post('/shift_assignment/bulk_store', payload),
};

export default shiftAssignmentApi;
