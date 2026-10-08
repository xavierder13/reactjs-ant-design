import axios from '../../api/axiosInstance';

// Government contribution / tax tables — vueportal ContributionTableController
// + ContributionService (contribution.maintenance; Administrator bypasses).
// A table = one agency's version from effective_date until its next one.
// - getAll({ agency? }) → { tables: [{ id, agency, effective_date, reference,
//   remarks, rows: [bracket], updater { name }, updated_at }] (agency, then
//   newest first), in_force: { SSS: id|null, PhilHealth, 'Pag-IBIG', BIR } }
//   (contribution-table-list).
// - getOptions() → { agencies, row_fields: { agency: [columns] } } — the
//   bracket columns each agency uses (all required; range_to blank only on
//   the last line = "and above", except PhilHealth's single floor/ceiling
//   line). Amounts 'n.nn', rates 'n.nnn' (percent).
// - create { agency, effective_date, reference, remarks, rows } /
//   update(id, same without agency) → 422 bag, or 422 { message } (agency
//   rules: "Line 2: overlaps …", "already a SSS table effective on …").
//   delete(id).
const contributionTableApi = {
  getAll:     (params)      => axios.post('/contribution_table/index', params),
  getOptions: ()            => axios.post('/contribution_table/options'),
  create:     (payload)     => axios.post('/contribution_table/store', payload),
  update:     (id, payload) => axios.post(`/contribution_table/update/${id}`, payload),
  delete:     (id)          => axios.post(`/contribution_table/delete/${id}`),
};

export default contributionTableApi;
