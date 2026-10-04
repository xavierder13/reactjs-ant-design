import axios from '../../api/axiosInstance';

// Backend: vueportal CompanyController, prefix `company` (company.maintenance
// → company-list/-create/-edit/-delete).
// - getAll()  → { companies: [{ id, name, active: 'Y'|'N', branches: [] }] }
// - create/update payload: { name (unique), active: 'Y'|'N' } — `active` is a
//   NOT NULL column, always send it.
// - Validation failures are HTTP 200 with a `{ field: [messages] }` bag;
//   success is `{ success: '<message>', company }`.
const companyApi = {
  getAll: ()            => axios.get('/company/index'),
  create: (payload)     => axios.post('/company/store', payload),
  update: (id, payload) => axios.post(`/company/update/${id}`, payload),
  delete: (id)          => axios.post('/company/delete', { company_id: id }),
};

export default companyApi;
