import axios from '../../api/axiosInstance';

// Careers portal ranks (recruitment-portal `ranks` — the rank of a careers
// position; the careers site groups openings by rank). vueportal POST
// /recruitment/setup/rank/<action> → gateway → portal RankController as the
// signed-in user. Permissions: careers-rank-list/-create/-edit/-delete.
// - getAll() → { ranks: [{ id, name, created_at, updated_at }] }
// - create / update payload { name } → { success: '<message>', rank } or,
//   on validation failure, HTTP 200 { name: [msg] } (required, unique).
// - delete(id) → { success: '<message>' }. No in-use check (portal rule) —
//   positions keep the deleted rank_id.
// Gateway refusals (no portal account / missing portal permission) → 403 { error }.
const careersRankApi = {
  getAll: ()            => axios.post('/recruitment/setup/rank/index'),
  create: (payload)     => axios.post('/recruitment/setup/rank/store', payload),
  update: (id, payload) => axios.post(`/recruitment/setup/rank/update/${id}`, payload),
  delete: (id)          => axios.post('/recruitment/setup/rank/delete', { rank_id: id }),
};

export default careersRankApi;
