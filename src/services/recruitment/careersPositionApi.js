import axios from '../../api/axiosInstance';

// Careers portal positions (recruitment-portal `positions` — what applicants
// apply for; not this HRIS's positions). vueportal POST
// /recruitment/setup/position/<action> → gateway → portal PositionController
// as the signed-in user. Permissions: careers-position-list/-create/-edit/-delete
// (index also allowed with careers-job-vacancy-create/-edit).
// - getAll() → { positions: [{ id, name, description, qualifications (HTML,
//   CKEditor), status 1|0, department_id, rank_id, department: { id, name,
//   division: { id, name } }, rank: { id, name }, level }], departments:
//   [{ id, name, division }], ranks: [{ id, name }], position_levels }
// - create / update payload { name, rank_id, department_id, status,
//   description, qualifications } → { success: '<message>', position }; on
//   validation failure HTTP 200 { field: [msg] }. The portal requires
//   description on update only. No job offer PDF: production's positions
//   table has no job_offer_file column.
// - delete(id) → { success: true, message }.
const careersPositionApi = {
  getAll: ()            => axios.post('/recruitment/setup/position/index'),
  create: (payload)     => axios.post('/recruitment/setup/position/store', payload),
  update: (id, payload) => axios.post(`/recruitment/setup/position/update/${id}`, payload),
  delete: (id)          => axios.post('/recruitment/setup/position/delete', { position_id: id }),
};

export default careersPositionApi;
