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
