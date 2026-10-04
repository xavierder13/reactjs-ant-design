import axios from '../../api/axiosInstance';

// Backend: vueportal RankController, prefix `rank` (rank.maintenance →
// rank-list/-create/-edit/-delete).
// - getAll()  → { ranks: [{ id, name }] }
// - create/update payload: { name } (unique)
// - Validation failures are HTTP 200 with a `{ field: [messages] }` bag;
//   success is `{ success: '<message>', rank }`.
const rankApi = {
  getAll: ()            => axios.get('/rank/index'),
  create: (payload)     => axios.post('/rank/store', payload),
  update: (id, payload) => axios.post(`/rank/update/${id}`, payload),
  delete: (id)          => axios.post('/rank/delete', { rank_id: id }),
};

export default rankApi;
