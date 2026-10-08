import axios from '../../api/axiosInstance';

// Access Charts — the shared multi-level approval procedures (MRF, Leave
// Application, Manual Time Entry, and older modules: Email, Online Banking,
// Tactical Requisition, Inventory…). vueportal AccessChartController +
// AccessChartUserMapController; permissions access-chart-list / -create
// (also adds an approver) / -edit / -delete (also removes an approver).
// - getAll() (GET) → { access_charts: [{ id, name, access_for,
//   max_approval_level, access_module { id, name }, approver_per_level:
//   [{ id, level, num_of_approvers }], access_chart_user_maps: [{ id,
//   user_id, access_level, user { id, name, email, branch { name } } }] }],
//   access_modules: [{ id, name }], users: [every user] }.
// - create / update(id) payload { name (unique), access_for (module id),
//   max_approval_level, approver_per_level: [{ id?, level, num_of_approvers }] }
//   → { success: '<message>', access_chart } or HTTP 200 { field: [msg] }.
//   Update replaces the levels: ones left out are removed (approvers mapped
//   to them stay but can't act).
// - delete(id) → { success } — removes its levels and approvers too.
// - addApprover({ access_chart_id, user_id, access_level }) → { success,
//   approver } or 200 { user_id: ['already an approver at this level'] };
//   removeApprover(mapId) → { success }.
// Modules find their chart BY NAME (e.g. "MRF - Additional", "Leave
// Application") — renaming / deleting one stops that module's approvals.
const accessChartApi = {
  getAll:         ()            => axios.get('/access_chart/index'),
  create:         (payload)     => axios.post('/access_chart/store', payload),
  update:         (id, payload) => axios.post(`/access_chart/update/${id}`, payload),
  delete:         (id)          => axios.post('/access_chart/delete', { access_chart_id: id }),
  addApprover:    (payload)     => axios.post('/access_chart_user_map/store', payload),
  removeApprover: (mapId)       => axios.post('/access_chart_user_map/delete', { approver_id: mapId }),
};

export default accessChartApi;
