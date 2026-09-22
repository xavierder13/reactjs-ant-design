import axios from '../../api/axiosInstance';

const manpowerRequestApi = {
  getAll:      ()               => axios.post('/manpower_request/index'),
  getCreate:   ()                => axios.post('/manpower_request/create'),
  getById:     (id)              => axios.post(`/manpower_request/edit/${id}`),
  // `payload` is a FormData instance whenever ManpowerRequestForm.jsx has a
  // newly-picked attachment for at least one line (needed to send the
  // actual file bytes) — explicit multipart headers here rather than
  // relying on axios to auto-detect FormData, since axiosInstance's own
  // default headers already hard-code 'Content-Type: application/json'.
  // A plain object payload (the common case — no new file this save)
  // still goes out as ordinary JSON, unaffected.
  create:      (payload)         => axios.post('/manpower_request/store', payload, payload instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
  update:      (id, payload)     => axios.post(`/manpower_request/update/${id}`, payload, payload instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
  submit:      (id)              => axios.post(`/manpower_request/submit/${id}`),
  approve:     (id)              => axios.post(`/manpower_request/approve/${id}`),
  reject:      (id, remarks)     => axios.post(`/manpower_request/reject/${id}`, { remarks }),
  returnForRevision: (id, remarks) => axios.post(`/manpower_request/return/${id}`, { remarks }),
  cancel:      (id)              => axios.post(`/manpower_request/cancel/${id}`),
  delete:      (id)              => axios.post(`/manpower_request/delete/${id}`),
  approvalHistory: (id)          => axios.post(`/manpower_request/approval_history/${id}`),
  recordHire:  (id, hires)       => axios.post(`/manpower_request/record_hire/${id}`, { hires }),

  // Post-save attachment management for a single, already-existing detail
  // line — used from ViewManpowerRequest.jsx. ManpowerRequestForm.jsx
  // (create/edit) instead sends a new file as part of the same store()/
  // update() call (see `create`/`update` above and
  // ManpowerRequestService::resolveLineFile() on the backend) — this pair
  // of endpoints is for attaching/replacing/removing a file afterward,
  // without resubmitting the whole form, while the request is still in an
  // editable status (Draft/Disapproved/Cancelled/Returned — enforced
  // server-side in fileUpload()/fileDelete()).
  detailFileUpload: (detailId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`/manpower_request/detail/${detailId}/file_upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  detailFileDownload: (detailId) => axios.post('/manpower_request/detail/file_download', { detail_id: detailId }, { responseType: 'blob' }),
  detailFileDelete:   (detailId) => axios.post('/manpower_request/detail/file_delete', { detail_id: detailId }),
};

export default manpowerRequestApi;