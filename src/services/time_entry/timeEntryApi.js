import axios from '../../api/axiosInstance';

// Manual time-in / time-out (field / outside work the biometric device
// couldn't record) — vueportal EmployeeTimeEntryController + TimeEntryService,
// prefix `time_entry` (time_entry.maintenance; Administrator bypasses).
// Approval like leave / MRF: the "Manual Time Entry" Access Chart (level 1 by
// position_subs subordinates, own branch outside ADMINISTRATION; higher
// levels: every mapped approver); without levels, time-entry-approve decides
// in one step. Visibility: time-entry-list-all sees all; others what they
// filed, their own, and what they approve / approved.
// - getAll(params) → { entries: paginator, see_all } — params: scope
//   ('for_approval'), page, per_page, status, entry_type, branch_id,
//   employee_id, date_from / date_to, search. Row: { id, employee_id, date,
//   time_in ('08:00:00' | null), time_out, entry_type, location, reason,
//   status, current_level, submitted_at, filed_by, acted_by, acted_at,
//   action_remarks, created_at, employee { employee_code, full_name, branch,
//   position }, filer { name }, actor { name } }.
// - options() → { types: [Field Work, Official Business, Missed Punch,
//   Device Problem], branches }.
// - preview({ employee_id, date, time_in, time_out, entry_type, location,
//   reason, entry_id? }) → { error, warnings, approvers (level 1; null = no
//   procedure), schedule (ScheduleService day: source, shift_code, day_off,
//   time_in, time_out), punches ({ time_in, time_out, logs: [{ punch, time
//   }] } | [] none that day | null BioBridge unreachable) }.
// - show(id) → { entry, approval: { configured, current_level, levels:
//   [{ level, required, approved, status, approvers, actions }], history,
//   can_approve }, schedule, punches }; 404 when not visible.
// - create / update(id) payload { employee_id (create only), date 'YYYY-MM-DD',
//   time_in 'HH:mm' | null, time_out (before time in = next day),
//   entry_type, location, reason } → { message, entry }; 422 bag or
//   { message } (future date, no time, a pending / approved entry that day,
//   acted-on).
// - act('approve'|'disapprove'|'cancel', id, remarks) → { message, entry }.
// Permissions: time-entry-list(-all), -create, -edit, -approve, -cancel.
const timeEntryApi = {
  getAll:  (params)              => axios.post('/time_entry/index', params),
  options: ()                    => axios.post('/time_entry/options'),
  preview: (payload)             => axios.post('/time_entry/preview', payload),
  show:    (id)                  => axios.post(`/time_entry/show/${id}`),
  create:  (payload)             => axios.post('/time_entry/store', payload),
  update:  (id, payload)         => axios.post(`/time_entry/update/${id}`, payload),
  act:     (action, id, remarks) => axios.post(`/time_entry/${action}/${id}`, { remarks }),
};

export default timeEntryApi;
