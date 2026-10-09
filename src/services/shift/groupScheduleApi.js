import axios from '../../api/axiosInstance';

// Default schedules per company / branch / position — vueportal
// GroupScheduleController, prefix `group_schedule` (shift.maintenance;
// group-schedule-list/-create/-edit/-cancel, Administrator bypasses).
// ScheduleService order: the employee's own shifting → a group shifting →
// the employee's own Work Schedule → a group default schedule → none; among
// groups the most specific wins (position, branch, company — by the
// employee's current branch / position).
// - getAll({ kind ('schedule'|'shifting'), scope ('company'|'branch'|
//   'position'), status ('Active' default | 'Cancelled' | 'All') }) →
//   { group_schedules: [{ id, kind, scope, scope_id, scope_name, shift_id,
//   date_from, date_to (null for 'schedule'), reason, status, cancel_reason,
//   cancelled_at, created_at, shift { code, name, active, days }, creator,
//   updater, canceller { name } }] } newest date_from first.
// - options() → { companies, branches (+ company_id), positions } [{ id, name }].
// - preview({ kind, scope, scope_id, shift_id, date_from, date_to, reason, id? })
//   → { error (null | the rule that blocks saving), reach { employees,
//   follow, own, more_specific, own_names, specific_names (≤ 20 each) } } —
//   on its first day; 422 bag while the form is incomplete.
// - create(payload) / update(id, payload — shift, dates, reason; kind and
//   group stay) → { message, group_schedule }; 422 bag or { message }.
// - cancel(id, reason) (reason required).
const groupScheduleApi = {
  getAll:  (params)      => axios.post('/group_schedule/index', params),
  options: ()            => axios.post('/group_schedule/options'),
  preview: (payload)     => axios.post('/group_schedule/preview', payload),
  create:  (payload)     => axios.post('/group_schedule/store', payload),
  update:  (id, payload) => axios.post(`/group_schedule/update/${id}`, payload),
  cancel:  (id, reason)  => axios.post(`/group_schedule/cancel/${id}`, { reason }),
};

export default groupScheduleApi;
