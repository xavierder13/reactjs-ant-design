import axios from "../../api/axiosInstance";

// Employee Master Data's Offboarding sub-record.
// Route source of truth: vueportal routes/api.php, prefix
// `employee_master_data/offboarding`, backed by `EmployeeOffboardingController`
// / `App\EmployeeOffboarding`.
//
// **Which of vueportal's two offboarding data sources is authoritative —
// resolved, not a remaining blocker.** vueportal keeps offboarding-shaped
// fields in two places: columns directly on `employee_master_data`
// (`last_day_of_work`, `reason_of_resignation`, `resignation_date_filed`,
// `resignation_effectivity_date`, `coe_is_issued`, `last_pay_is_issued`,
// `compliance` — all still settable via the main `update()` endpoint) and
// this dedicated `employee_offboardings` table (created a month later,
// with the same fields plus `resignation_date_received` and three file
// attachment slots the core table doesn't have). Confirmed by reading
// `Offboarding.vue` (the component actually wired into
// `EmployeeInformationTabs.vue`'s Offboarding tab) directly: its every
// save goes through `/employee_master_data/offboarding/store` or
// `/update/:id` — it never writes those fields onto the core employee
// record. `employee_offboardings` is the live, authoritative source; the
// `employee_master_data` columns are a superseded legacy holdover (still
// read by `EmployeeMasterDataExport`, not written by any live UI flow).
//
// Same shape/caveats as disciplinaryApi.js/nteApi.js: `index()` is a
// global cross-employee "open cases" queue (not used here — this tab
// reads `offboardings` off the employee record itself, confirmed present
// in `EmployeeMasterDataController::getEmployees()`'s eager-loads);
// create/update are multipart; an existing file blocks a same-slot
// replacement until it's deleted first. THREE independent files per
// record this time (`last_day_file`, `clearance_file`, `quitclaim_file`),
// each needing its own `document_type` on file-scoped calls.
//
// Permission strings here are confirmed against the LIVE `vueportal`
// database (`role_has_permissions`), not just `PermissionSeeder.php`'s
// source or the middleware's checked strings — those two alone were
// misleading for this module (see the employee-master-data skill's
// correction note for the full story): `employee-master-data-offboarding-list`
// looks like the right "view" permission by naming convention and is what
// the middleware checks for the dedicated `/offboarding/index` route, but
// it doesn't exist as a granted permission for ANY role in the live data
// — that route is unreachable by anyone right now (moot here regardless,
// since this tab never calls it). The actually-used gate, confirmed both
// in the live data (10 roles) and in `EmployeeInformationTabs.vue`'s real
// `tabItems` computed property, is the base `employee-master-data-offboarding`
// string — see `OffboardingTab.jsx`.
const offboardingApi = {
  // POST /api/employee_master_data/offboarding/store (multipart)
  // fields: employee_id, last_day_of_work (YYYY-MM-DD, required),
  // reason_of_resignation?, resignation_date_filed?, resignation_date_received?,
  // resignation_effectivity_date?, coe_is_issued? (0|1), last_pay_is_issued? (0|1),
  // compliance?, last_day_file?/clearance_file?/quitclaim_file? (jpeg/jpg/png/docs/docx/pdf, max 10MB)
  create: (formData) => axios.post('/employee_master_data/offboarding/store', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // POST /api/employee_master_data/offboarding/update/:id (multipart, same fields)
  update: (id, formData) => axios.post(`/employee_master_data/offboarding/update/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // POST /api/employee_master_data/offboarding/delete
  // body: { offboarding_id }
  remove: (offboardingId) => axios.post('/employee_master_data/offboarding/delete', { offboarding_id: offboardingId }),

  // POST /api/employee_master_data/offboarding/file_download
  // body: { offboarding_id, document_type: 'last_day_file' | 'clearance_file' | 'quitclaim_file' }
  fileDownload: (offboardingId, documentType) => axios.post('/employee_master_data/offboarding/file_download', { offboarding_id: offboardingId, document_type: documentType }, { responseType: 'blob' }),

  // POST /api/employee_master_data/offboarding/file_delete
  // body: { offboarding_id, document_type: 'last_day_file' | 'clearance_file' | 'quitclaim_file' }
  fileDelete: (offboardingId, documentType) => axios.post('/employee_master_data/offboarding/file_delete', { offboarding_id: offboardingId, document_type: documentType }),
};

export default offboardingApi;
