import axios from '../../api/axiosInstance';

// vueportal RecruitmentController endpoints — local HR data, plus the ATS
// lists it proxies from the careers portal (recruitment-portal).
const recruitmentApi = {
  // GET /recruitment/<list> — list is an APPLICANT_STAGES `api` value
  // (applicant_list, screening_list, …, hired_list), each gated by its own
  // careers-*-list permission → { job_applicants: [...], branches,
  // positions, branch_companies }. Rows carry dates as "MM/DD/YYYY"
  // strings and a ready `progress_status` label. On a careers-portal
  // failure vueportal answers with the portal's status and { error }.
  getApplicants: (list) => axios.get(`/recruitment/${list}`),

  // GET /recruitment/view_applicant/{id} (any careers-*-list) → { success,
  // applicant (56 fields; stage dates YYYY-MM-DD, birthdate/date_submitted
  // MM/DD/YYYY, preferences comma ids), educ_attains, experiences,
  // references, fam_members, dependents, applicant_files }.
  viewApplicant: (id) => axios.get(`/recruitment/view_applicant/${id}`),

  // POST /recruitment/file_download { file_id } (careers-file-download) → blob.
  downloadFile: (fileId) => axios.post('/recruitment/file_download', { file_id: fileId }, { responseType: 'blob' }),

  // The calls below run the portal's own ApplicantController /
  // ApplicantFileController methods as the signed-in user (gateway). A
  // refusal (no portal account, missing portal permission, Branch Manager
  // locked step) comes back as 403/422 { error: "..." }. The portal itself
  // answers some failures with HTTP 200 — check `success` first.

  // POST /recruitment/update_status (careers-update-status) { applicant_id,
  // step 0–5, ...that step's fields } → { success, resp, applicant } where
  // `applicant` has the list-row shape (MM/DD/YYYY dates, employment
  // names). Branch Manager acting on an already-updated Exam/B.I step →
  // 200 { warning }.
  updateStatus: (payload) => axios.post('/recruitment/update_status', payload),

  // POST /recruitment/update_hiring_details (careers-update-hiring-details)
  // { applicant_id, every step field } → { success, resp, applicant };
  // validation failure → 200 { error: { field: [msg] } }.
  updateHiringDetails: (payload) => axios.post('/recruitment/update_hiring_details', payload),

  // POST /recruitment/file_upload (careers-file-upload), multipart
  // { applicant_id, document_type, file } → { success: "File has been
  // uploaded", applicant_file }. vueportal validates first (422 { error:
  // { field: [msg] } }); the portal answers its own failures with 200 { error }.
  uploadFile: (applicantId, documentType, file) => {
    const formData = new FormData();
    formData.append('applicant_id', applicantId);
    formData.append('document_type', documentType);
    formData.append('file', file);
    return axios.post('/recruitment/file_upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  // POST /recruitment/file_delete { file_id } (careers-file-delete) →
  // { success: "Record has been deleted" }; 422 { error } once the Final
  // Interview is passed or for the applicant's Resume.
  deleteFile: (fileId) => axios.post('/recruitment/file_delete', { file_id: fileId }),

  // POST /recruitment/send-email (careers-notification-send-email) /
  // send-sms (careers-notification-send-sms) { applicant_id, step,
  // notif_type, position, date?, time?, venue?, facilitator?,
  // facilitator_position?, deadline_date? } → { success: "Email/SMS has been
  // sent", log }. Failures: 200 { error } (no email / unknown template),
  // 422 { error } (invalid phone), 200 { success: false, status, body }
  // (M360 refused), 5xx { error } (mail server).
  sendEmail: (payload) => axios.post('/recruitment/send-email', payload),
  sendSms: (payload) => axios.post('/recruitment/send-sms', payload),

  // POST /recruitment/delete_applicant/{id} (careers-applicant-delete) →
  // { success, message } — also deletes the applicant's files.
  deleteApplicant: (id) => axios.post(`/recruitment/delete_applicant/${id}`),

  // POST /recruitment/secondary_details { id: [applicant ids] } (any
  // careers-*-list) → { success, educ_attains, references, files }, each
  // row carrying applicant_id — the list's "incomplete" indicators.
  secondaryDetails: (ids) => axios.post('/recruitment/secondary_details', { id: ids }),

  // GET /recruitment/total_active_employees (any logged-in user)
  // → { total_active_employees } — employee_master_data.active = 1.
  getTotalActiveEmployees: () => axios.get('/recruitment/total_active_employees'),

  // GET /recruitment/vacancies (vacancy-list) → { vacancies: [{ position, position_id,
  //   branch, branch_id, required, current }] } — only rows where required ≠ current.
  getVacancies: () => axios.get('/recruitment/vacancies'),

  // POST /recruitment/export_vacancies (vacancy-export) — body { vacancies:
  //   [{ position, branch, required, current, vacancy }] } → .xls blob of
  //   exactly the rows sent (the page sends what it's showing).
  exportVacancies: (vacancies) => axios.post('/recruitment/export_vacancies', { vacancies }, { responseType: 'blob' }),
};

export default recruitmentApi;
