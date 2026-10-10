import axios from '../../api/axiosInstance';

// Self-service attendance — vueportal MyAttendanceController (auth only):
// the signed-in user's own daily time record (the employee linked to their
// account) per payroll cut-off, the same DTR the payroll pays from.
// - getOptions() → { linked, cutoffs: [{ id, code, date_from, date_to,
//   pay_date }] up to the current one, newest first, current_id }.
// - show({ payroll_cutoff_id }) → same shape as dtrApi.show (cutoff,
//   employee, days, summary); 422 { message } when the account isn't linked.
const myAttendanceApi = {
  getOptions: ()        => axios.post('/my_attendance/options'),
  show:       (payload) => axios.post('/my_attendance/show', payload),
};

export default myAttendanceApi;
