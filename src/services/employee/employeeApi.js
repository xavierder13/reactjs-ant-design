import axios from '../../api/axiosInstance';

// CRUD + attachment endpoints for the Employee Master Data core record.
// Route source of truth: vueportal routes/api.php, prefix `employee_master_data`
// (POST-only, no REST verbs — follow this module's own backend convention,
// not KPI's). There is NO single-employee "show/{id}" endpoint on this
// module (unlike Manpower Request's `/edit/{id}`) — View/Edit pages get
// their record from the list row via router state, not a fetch here.
//
// file_upload/file_delete/file_download confirmed against
// EmployeeMasterDataController: file_upload reads `file` + `document_type`
// (saved as the file's `title`) and answers HTTP 200 with `{ success, file }`
// or `{ error }` — callers must check `data.error`.
const employeeApi = {
  getAll:   (payload = {}) => axios.post('/employee_master_data/index', payload),
  // Form option lists → { branches, departments, positions } ([{ id, name }],
  // by name). Gated by employee-master-data-list/-create/-edit — unlike
  // /branch/index, /department/index and /position/get-all, which need
  // branch-list/department-list/position-list that HR roles don't have.
  getCreate: ()            => axios.post('/employee_master_data/create'),
  // `payload` is a FormData instance whenever EmployeeForm.jsx's create
  // flow has pending files/sub-records staged (Files & Requirements,
  // Evaluation & Regularization, NTE, Disciplinary, or any Performance
  // Management sub-tab) — explicit multipart headers here rather than
  // relying on axios to auto-detect FormData, since axiosInstance's own
  // default headers already hard-code 'Content-Type: application/json'
  // (same pattern as manpowerRequestApi.js's create/update). A plain
  // object payload (no pending create-mode data) still goes out as
  // ordinary JSON, unaffected.
  create:   (payload)      => axios.post('/employee_master_data/store', payload, payload instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
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
  // The signed-in user's own record via users.employee_id → `{ success,
  // employee }` (employee null when the account isn't linked). Any
  // authenticated user may call it.
  myProfile:    ()         => axios.post('/employee_master_data/my_profile'),
  // `profile_picture` (jpg/jpeg/png here) → HTTP 200 `{ success,
  // profile_picture: { profile_file_name, profile_file_path,
  // profile_file_type } }` or `{ error }`. The image itself is served by
  // the public web route — see utils/employeePhoto.js.
  profilePictureUpload: (employeeId, file) => {
    const formData = new FormData();
    formData.append('profile_picture', file);
    return axios.post(`/employee_master_data/profile_picture_upload/${employeeId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // file_download reads `file_id` (file_delete reads `id`) — confirmed in
  // EmployeeMasterDataController and vueportal's EmployeeInformationTabs.vue.
  fileDownload: (fileId)   => axios.post('/employee_master_data/file_download', { file_id: fileId }, { responseType: 'blob' }),

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
  // modules not built here yet (Attendance tab, dashboard reports; Branch
  // Manpower has its own endpoints — branchManpowerApi.js). Always pass
  // `report_type: 'Employee List'`. See the employee-master-data skill.
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

  // New Hired (vueportal EmployeeNewHired.vue): careers-portal hired
  // applicants (orientation passed, contract signed up to today) not yet
  // synced. GET /employee_master_data/new_hired (employee-master-data-new-hired-list)
  // → { employees: [applicant rows, as the portal's all_job_applicants()], ... }
  getNewHired: () => axios.get('/employee_master_data/new_hired'),
  // POST /employee_master_data/sync/new_hired (employee-master-data-sync-new-hired)
  // body: { employees: [the selected rows, as received] } — creates each as a
  // Probationary employee (skipped when one with the same name, birthdate and
  // gender exists) and logs it as synced either way.
  syncNewHired: (employees) => axios.post('/employee_master_data/sync/new_hired', { employees }),

  // Segment lists — the Hired This Month / For Regularization / Resigned
  // pages, and the Workforce Dashboard's counts (read `employees.total`).
  // All paginated via ?page=. `table_headers` must be headers this endpoint's
  // own `$table_fields` whitelist understands — send [] when not searching.
  // POST /employee_master_data/hired_this_month — active, employed this
  // month, Sales Specialists excluded unless include_sales_specialist.
  getHiredThisMonth: (payload, page = 1) => axios.post(`/employee_master_data/hired_this_month?page=${page}`, payload),
  // POST /employee_master_data/for_regularization — active Probationary,
  // employed 150+ days.
  getForRegularization: (payload, page = 1) => axios.post(`/employee_master_data/for_regularization?page=${page}`, payload),
  // POST /employee_master_data/for_regularization/export — same filters as the
  // list (search, search_branch, table_headers, include_sales_specialist), .xls blob.
  exportForRegularization: (payload) => axios.post('/employee_master_data/for_regularization/export', payload, { responseType: 'blob' }),
  // POST /employee_master_data/resigned — latest offboarding per employee,
  // filtered by date_field_param ('resignation_date_filed' default) between
  // date_from and date_to.
  getResigned: (payload, page = 1) => axios.post(`/employee_master_data/resigned?page=${page}`, payload),
  // POST /employee_master_data/resigned/export — same filters as the list, .xls blob.
  exportResigned: (payload) => axios.post('/employee_master_data/resigned/export', payload, { responseType: 'blob' }),
};

export default employeeApi;
