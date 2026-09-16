import axios from '../../api/axiosInstance';

// Backend: app/Http/Controllers/API/EmployeeAcknowledgmentReportController.php
// (vueportal, merged into F-HRIS-Staging from master 2026-09-16). Confirmed
// directly from that controller's source, not inferred:
// - getAll() returns branches (each with a nested `acknowledgment_reports`
//   array, `user` eager-loaded) — scoped server-side to the user's own
//   branch unless they hold `employee-acknowledgment-reports-all`.
// - store() takes { branch_id, employees: [{ employee_id, is_active }] } —
//   a snapshot of a row selection from the Employee Master Data list at
//   submission time, not a file upload despite the Vue UI's "Upload
//   Employee Report" button label/icon.
// - view()/export() take { acknowledgment_id }; export() returns an .xlsx
//   blob (Excel::download server-side).
const employeeAcknowledgmentReportApi = {
  getAll:  ()                    => axios.get('/employee_master_data/acknowledgment_reports'),
  create:  (payload)             => axios.post('/employee_master_data/acknowledgment_reports/store', payload),
  view:    (acknowledgmentId)    => axios.post('/employee_master_data/acknowledgment_reports/view', { acknowledgment_id: acknowledgmentId }),
  export:  (acknowledgmentId)    => axios.post('/employee_master_data/acknowledgment_reports/export', { acknowledgment_id: acknowledgmentId }, { responseType: 'blob' }),
  delete:  (acknowledgmentId)    => axios.post('/employee_master_data/acknowledgment_reports/delete', { acknowledgment_id: acknowledgmentId }),
};

export default employeeAcknowledgmentReportApi;
