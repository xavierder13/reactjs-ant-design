import axios from '../../api/axiosInstance';

// Timekeeping (DTR) — vueportal DtrController + DtrService (dtr.maintenance,
// `dtr-list`; Administrator bypasses). Per employee per date of a cut-off:
// the schedule in force, the day type (holidays of the branch), punches
// (BioBridge; an approved manual time entry replaces them), approved leave
// and overtime → late / undertime / absence / worked / night minutes.
// - options() → { cutoffs: [{ id, code, date_from, date_to, pay_date,
//   filing_open }] newest first, branches: [{ id, name }] }.
// - getAll({ payroll_cutoff_id, branch_id, search, page, per_page ≤ 50 }) →
//   { cutoff, employees: paginator of { id, employee_code, full_name,
//   branch, position, summary } } — active employees.
// - show({ payroll_cutoff_id, employee_id }) → { cutoff, employee { id,
//   employee_code, full_name, branch, position }, days, summary }.
// A day: { date, day, schedule { source, shift_code, day_off, time_in,
//   time_out, break_minutes, grace_minutes }, day_type, holidays [{ title,
//   holiday_type }], time_in / time_out ('HH:mm', out may end ' (+1)'),
//   in_source / out_source ('biometric' | 'time entry'), leave { type, code,
//   paid, half_day } | null, status (Present | Absent | On Leave | Half-day
//   Leave | Half-day Leave, Absent | Incomplete | Holiday | Holiday Worked |
//   Holiday Worked (day off) | Rest Day | Rest Day Worked | No Schedule |
//   Upcoming), worked_minutes, late_minutes, undertime_minutes,
//   night_minutes, absent_days, paid_leave_days, unpaid_leave_days,
//   holiday_pay_eligible, overtime [{ from, to, minutes, night_minutes }],
//   ot_minutes, ot_night_minutes, remarks [] }.
// summary: { days, present, upcoming, absent_days, paid_leave_days,
//   unpaid_leave_days, holidays, holidays_worked, rest_days, late_minutes,
//   undertime_minutes, worked_minutes, night_minutes, ot_minutes,
//   ot_night_minutes, exceptions }.
const dtrApi = {
  options: ()        => axios.post('/dtr/options'),
  getAll:  (params)  => axios.post('/dtr/index', params),
  show:    (payload) => axios.post('/dtr/show', payload),
};

export default dtrApi;
