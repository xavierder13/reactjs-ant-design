import axios from '../../api/axiosInstance';

// CRUD + attachment endpoints for the Employee Master Data core record.
// Route source of truth: vueportal routes/api.php, prefix `employee_master_data`
// (POST-only, no REST verbs — follow this module's own backend convention,
// not KPI's). There is NO single-employee "show/{id}" endpoint on this
// module (unlike Manpower Request's `/edit/{id}`) — View/Edit pages get
// their record from the list row via router state, not a fetch here.
//
// file_upload/file_delete/file_download payload/response shapes below are
// inferred from this repo's own multipart-upload conventions, not confirmed
// against the live EmployeeMasterDataController implementation — verify
// against a real request/response before treating them as settled.
const employeeApi = {
  getAll:   (payload = {}) => axios.post('/employee_master_data/index', payload),
  create:   (payload)      => axios.post('/employee_master_data/store', payload),
  update:   (id, payload)  => axios.post(`/employee_master_data/update/${id}`, payload),
  // Payload key (`ids`) is inferred from the route accepting bulk-or-single
  // delete, not confirmed against the live controller — verify against a
  // real request before relying on this.
  delete:   (ids)          => axios.post('/employee_master_data/delete', { ids }),

  fileUpload: (employeeId, file, meta = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(meta).forEach(([key, value]) => formData.append(key, value));
    return axios.post(`/employee_master_data/file_upload/${employeeId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  fileDelete:   (fileId)   => axios.post('/employee_master_data/file_delete', { id: fileId }),
  fileDownload: (fileId)   => axios.post('/employee_master_data/file_download', { id: fileId }, { responseType: 'blob' }),

  // Bulk import — payload field name ("file") and the shape of a
  // per-row-validation-failure response are inferred (this backend action
  // uses maatwebsite/excel per vueportal's CLAUDE.md) and not confirmed
  // against the live controller. See the employee-master-data skill.
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post('/employee_master_data/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // `/employee_master_data/export` is actually a multi-report dispatcher on
  // the backend (report_type: 'Employee List' | 'Employee Attendance
  // Report' | 'Branch Manpower Report' | 'Key Performance Index
  // Monitoring') — this app only wires up 'Employee List' (the natural
  // companion to Import/the core record), since the other three belong to
  // modules not built here yet (Attendance tab, dashboard reports). Always
  // pass `report_type: 'Employee List'`. See the employee-master-data skill.
  export: (payload) => axios.post('/employee_master_data/export', payload, { responseType: 'blob' }),

  // Single-purpose: downloads only the core Employee Master Data import
  // template (no params). The vueportal reference's "Generate Template"
  // dialog also lists template downloads for several other sub-modules
  // (Branch Assignment Position, Monthly Key Performance, NTE, etc.) —
  // none of those exist in this app yet, so they're intentionally not
  // wired here. See the employee-master-data skill.
  templateDownload: () => axios.post('/employee_master_data/template/download', {}, { responseType: 'blob' }),

  // POST /employee_master_data/resign — body: { employee_id, date_resigned }.
  // Confirmed from vueportal's Offboarding.vue: called automatically right
  // after saving an offboarding record (not a separate manual action) —
  // see OffboardingTab.jsx. Flips `active`/`date_resigned` on the core
  // employee record; does not touch the offboarding record itself.
  resign: (payload) => axios.post('/employee_master_data/resign', payload),
};

export default employeeApi;
