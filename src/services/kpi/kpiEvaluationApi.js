import axios from '../../api/axiosInstance';

const kpiEvaluationApi = {

  // GET /api/kpi/evaluations
  getAll: (params = {}) => axios.get('/kpi/evaluations', { params }),

  // GET /api/kpi/evaluations/:id
  getById: (id) => axios.get(`/kpi/evaluations/${id}`),

  // POST /api/kpi/evaluations
  create: (payload) => axios.post('/kpi/evaluations', payload),
  
  bulkCreate: (payload) => axios.post('/kpi/evaluations/bulk', payload), // ← new

  // PUT /api/kpi/evaluations/:id
  update: (id, payload) => axios.put(`/kpi/evaluations/${id}`, payload),

  // PUT /api/kpi/evaluations/:id/submit
  submit: (id) => axios.put(`/kpi/evaluations/${id}/submit`),

  // PUT /api/kpi/evaluations/:id/approve
  approve: (id) => axios.put(`/kpi/evaluations/${id}/approve`),

  // GET /api/kpi/employees (lightweight list)
  getEmployees: (params = {}) => axios.get('/kpi/employees', { params }),

  // GET /api/kpi/my-evaluations
  getMyEvaluations: () => axios.get('/kpi/my-evaluations'),

  // GET /api/kpi/my-evaluations/:id
  getMyEvaluationById: (id) => axios.get(`/kpi/my-evaluations/${id}`),

  // PUT /api/kpi/my-evaluations/:id/self-evaluate
  selfEvaluate: (id, payload) => axios.put(`/kpi/my-evaluations/${id}/self-evaluate`, payload),

  delete: (id) => axios.delete(`/kpi/evaluations/${id}`),

};

export default kpiEvaluationApi;