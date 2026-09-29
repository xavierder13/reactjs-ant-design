import axios from '../../api/axiosInstance';

// vueportal RecruitmentController endpoints that read local HR data (not the
// careers portal).
const recruitmentApi = {
  // GET /recruitment/total_active_employees (any logged-in user)
  // → { total_active_employees } — employee_master_data.active = 1.
  getTotalActiveEmployees: () => axios.get('/recruitment/total_active_employees'),

  // GET /recruitment/vacancies (vacancy-list) → { vacancies: [{ position, position_id,
  //   branch, branch_id, required, current }] } — only rows where required ≠ current.
  getVacancies: () => axios.get('/recruitment/vacancies'),
};

export default recruitmentApi;
