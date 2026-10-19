import axios from '../../api/axiosInstance';

// Self-service filings (My Workspace → My Leave / My Time Entries / My
// Overtime) — vueportal MyFilingController, prefix `my_filing`, auth only
// (no permission; the employee linked to the account). Filing / editing /
// cancelling use each module's own api (leaveApi, timeEntryApi,
// overtimeApi) with the *-own permissions.
// - getAll(module, params) → { linked, leaves | entries | overtimes:
//   paginator (the module's own row shape), + leave: { year, balances:
//   [{ leave_type { id, name, code, is_paid }, credits, used, pending,
//   balance, ineligibility, … }] }, + time_entry: { types } } — params:
//   status, date_from / date_to, page, per_page, year (leave balances).
// - show(module, id) → the module's own details payload; 404 unless it is
//   the user's own filing.
// module: 'leave' | 'time_entry' | 'overtime'.
const myFilingApi = {
  getAll: (module, params) => axios.post(`/my_filing/${module}/index`, params),
  show:   (module, id)     => axios.post(`/my_filing/${module}/show/${id}`),
};

export default myFilingApi;
