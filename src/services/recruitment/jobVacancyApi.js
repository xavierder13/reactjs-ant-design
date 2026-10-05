import axios from '../../api/axiosInstance';

// Careers portal job vacancies — the openings shown on the careers site.
// vueportal POST /recruitment/setup/job_vacancy/<action> → gateway → portal
// JobVacancyController as the signed-in user. Permissions:
// careers-job-vacancy-list/-create/-edit/-delete.
// - getAll() → { job_vacancy_lists: [{ id, position_name, branch_type
//   ('Branch Only' | 'Admin Only'), status 1|0 }] } (vacancies whose position
//   was deleted are left out by the portal's join).
// - getById(id) → { success, resp: { id, position_id, branch_type 0|1,
//   educ_attain, status, hiring_branches: [{ job_vacancy_id, branch_id }] } }
// - create payload { position_id, educ_attain, branch_type 0 (Branch) |
//   1 (Admin), status, hiring_branches: careers branch ids } → { success:
//   true, resp: '<message>' }; validation failure HTTP 200 { field: [msg] }.
// - update payload { job_vac_id, status, hiring_branches } — the portal only
//   changes status and the hiring branches (replace-all) → { success, resp }.
// - delete(id) → { success, message }.
const jobVacancyApi = {
  getAll:  ()        => axios.post('/recruitment/setup/job_vacancy/index'),
  getById: (id)      => axios.post(`/recruitment/setup/job_vacancy/edit/${id}`),
  create:  (payload) => axios.post('/recruitment/setup/job_vacancy/store', payload),
  update:  (payload) => axios.post('/recruitment/setup/job_vacancy/update', payload),
  delete:  (id)      => axios.post(`/recruitment/setup/job_vacancy/delete/${id}`),
};

export default jobVacancyApi;
