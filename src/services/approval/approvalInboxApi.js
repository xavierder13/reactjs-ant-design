import axios from '../../api/axiosInstance';

// Approvals inbox — vueportal ApprovalInboxController (auth:api; each module
// gated by its own permission, as the bell).
// - inbox() → { modules: [{ key ('leave' | 'time_entry' | 'overtime' | 'mrf'
//   | 'kpi' | 'payroll_run' | 'thirteenth_month' | 'clearance'), label,
//   rows: [{ id, reference, employee, branch, detail, date, submitted_at,
//   level }] }] } — only the modules the user approves in.
const approvalInboxApi = {
  inbox: () => axios.post('/approvals/inbox'),
};

export default approvalInboxApi;
