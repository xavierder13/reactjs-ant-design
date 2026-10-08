import axios from '../../api/axiosInstance';

// Overtime filings — vueportal EmployeeOvertimeController + OvertimeService,
// prefix `overtime` (overtime.maintenance; Administrator bypasses). Only
// Approved overtime is paid. Approval like manual time entries: the
// "Overtime" Access Chart; without levels, overtime-approve decides in one
// step; nobody approves their own (linked account). Visibility:
// overtime-list-all sees all; others what they filed, their own, and what
// they approve / approved.
// - getAll(params) → { overtimes: paginator, see_all } — params: scope
//   ('for_approval'), page, per_page, status, day_type, branch_id,
//   employee_id, date_from / date_to, search. Row: { id, employee_id, date,
//   time_from / time_to ('17:00:00'; to before from = next day),
//   break_minutes, hours ('3.50'), day_type, reason, status, current_level,
//   filer { name }, actor { name }, employee { employee_code, full_name,
//   branch, position } }.
// - options() → { day_types, branches }.
// - preview({ employee_id, date, time_from, time_to, break_minutes, reason,
//   overtime_id? }) → { error, warnings, hours, approvers, schedule, punches,
//   day: { day_type, rest_day, holidays: [{ title, holiday_type }] } }.
// - show(id) → { overtime, approval, schedule, punches, day }.
// - create / update(id) { employee_id (create only), date, time_from,
//   time_to, break_minutes, reason } → { message, overtime }; 422 bag or
//   { message } (overlap, break too long, > 16 h, filing switch off,
//   acted-on).
// - act('approve'|'disapprove'|'cancel', id, remarks).
// Permissions: overtime-list(-all), -create, -edit, -approve, -cancel.
const overtimeApi = {
  getAll:  (params)              => axios.post('/overtime/index', params),
  options: ()                    => axios.post('/overtime/options'),
  preview: (payload)             => axios.post('/overtime/preview', payload),
  show:    (id)                  => axios.post(`/overtime/show/${id}`),
  create:  (payload)             => axios.post('/overtime/store', payload),
  update:  (id, payload)         => axios.post(`/overtime/update/${id}`, payload),
  act:     (action, id, remarks) => axios.post(`/overtime/${action}/${id}`, { remarks }),
};

export default overtimeApi;
