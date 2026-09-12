import axios from '../../api/axiosInstance';

const manpowerRequestApi = {
  getAll:      ()               => axios.post('/manpower_request/index'),
  getCreate:   ()                => axios.post('/manpower_request/create'),
  getById:     (id)              => axios.post(`/manpower_request/edit/${id}`),
  create:      (payload)         => axios.post('/manpower_request/store', payload),
  update:      (id, payload)     => axios.post(`/manpower_request/update/${id}`, payload),
  submit:      (id)              => axios.post(`/manpower_request/submit/${id}`),
  approve:     (id)              => axios.post(`/manpower_request/approve/${id}`),
  reject:      (id, remarks)     => axios.post(`/manpower_request/reject/${id}`, { remarks }),
  returnForRevision: (id, remarks) => axios.post(`/manpower_request/return/${id}`, { remarks }),
  cancel:      (id)              => axios.post(`/manpower_request/cancel/${id}`),
  delete:      (id)              => axios.post(`/manpower_request/delete/${id}`),
  approvalHistory: (id)          => axios.post(`/manpower_request/approval_history/${id}`),
};

export default manpowerRequestApi;