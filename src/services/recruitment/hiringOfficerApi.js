import axios from '../../api/axiosInstance';

// Hiring officers — the Hiring Officer Name options on an applicant's Final
// Interview step (Update Status / Hiring Details). This HRIS's own table
// (vueportal HiringOfficerController), not a careers portal record: each
// officer is an Employee Master Data record (active, ADMINISTRATION branch,
// Managerial-rank position); the applicant stores the name and position as
// text. Permissions: hiring-officer-list/-create/-edit/-delete (Administrator
// bypasses); index also allowed with careers-update-status /
// careers-update-hiring-details (the picker).
// - getAll() → { success, hiring_officers: [{ id, employee_id, employee:
//   { id, employee_code, first_name, last_name, middle_name, full_name,
//   active, branch: { id, name }, position: { id, name, rank: { id, name } } } }],
//   branch: 'ADMINISTRATION', rank: 'Managerial' } — employee may be null
//   (deleted record).
// - getCreate() → { success, employees: [{ id, employee_code, first_name,
//   last_name, middle_name, position, hiring_officer_id }], branch, rank } —
//   only eligible employees; hiring_officer_id = the officer row using them.
// - create / update payload { employee_id } → { success, message,
//   hiring_officer }; validation failure → HTTP 422 { employee_id: [msg] }
//   (required, not already an officer, eligible).
// - delete(id) → { success, message }. Applicants keep the text.
const hiringOfficerApi = {
  getAll:    ()            => axios.post('/hiring_officer/index'),
  getCreate: ()            => axios.post('/hiring_officer/create'),
  create:    (payload)     => axios.post('/hiring_officer/store', payload),
  update:    (id, payload) => axios.post(`/hiring_officer/update/${id}`, payload),
  delete:    (id)          => axios.post(`/hiring_officer/delete/${id}`),
};

export default hiringOfficerApi;
