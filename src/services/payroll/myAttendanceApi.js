import axios from '../../api/axiosInstance';

// Self-service attendance — vueportal MyAttendanceController (auth only):
// the signed-in user's own daily time record (the employee linked to their
// account) per payroll cut-off, the same DTR the payroll pays from.
// - getOptions() → { linked, cutoffs: [{ id, code, date_from, date_to,
//   pay_date }] up to the current one, newest first, current_id }.
// - show({ payroll_cutoff_id }) or show({ date_from, date_to }) (Y-m-d, up
//   to 93 days) → same shape as dtrApi.show (cutoff — null for a range —,
//   period { date_from, date_to }, employee, days, summary); 422 { message }
//   when the account isn't linked or the range is too long.
const myAttendanceApi = {
  getOptions: ()        => axios.post('/my_attendance/options'),
  show:       (payload) => axios.post('/my_attendance/show', payload),
};

export default myAttendanceApi;
