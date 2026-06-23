import axios from "../../api/axiosInstance";

const kpiTemplateApi = {
  
  // GET /api/kpi/templates
  getAll: () => axios.get('/kpi/templates'),

  // GET /api/kpi/templates/:id
  getById: (id) => axios.get(`/kpi/templates/${id}`),

  // POST /api/kpi/templates
  create: (payload) => axios.post('/kpi/templates', payload),
  
  // PUT /api/kpi/templates/:id
  update: (id, payload) => axios.put(`/kpi/templates/${id}`, payload),

  // DELETE /api/kpi/templates/:id - on the back-end, the procedure only deactivate the record, set to is_active = false
  deactivate: (id) => axios.delete(`/kpi/templates/${id}`),

};

export default kpiTemplateApi;