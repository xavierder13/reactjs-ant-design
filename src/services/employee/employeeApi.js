import axios from '../../api/axiosInstance';

// CRUD + attachment endpoints for the Employee Master Data core record.
// Route source of truth: vueportal routes/api.php, prefix `employee_master_data`
// (POST-only, no REST verbs — follow this module's own backend convention,
// not KPI's). There is NO single-employee "show/{id}" endpoint on this
// module (unlike Manpower Request's `/edit/{id}`) — View/Edit pages get
// their record from the list row via router state, not a fetch here.
//
// file_upload/file_delete/file_download payload/response shapes below are
// inferred from this repo's own multipart-upload conventions, not confirmed
// against the live EmployeeMasterDataController implementation — verify
// against a real request/response before treating them as settled.
const employeeApi = {
  getAll:   (payload = {}) => axios.post('/employee_master_data/index', payload),
  create:   (payload)      => axios.post('/employee_master_data/store', payload),
  update:   (id, payload)  => axios.post(`/employee_master_data/update/${id}`, payload),
  // Payload key (`ids`) is inferred from the route accepting bulk-or-single
  // delete, not confirmed against the live controller — verify against a
  // real request before relying on this.
  delete:   (ids)          => axios.post('/employee_master_data/delete', { ids }),

  fileUpload: (employeeId, file, meta = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(meta).forEach(([key, value]) => formData.append(key, value));
    return axios.post(`/employee_master_data/file_upload/${employeeId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  fileDelete:   (fileId)   => axios.post('/employee_master_data/file_delete', { id: fileId }),
  fileDownload: (fileId)   => axios.post('/employee_master_data/file_download', { id: fileId }, { responseType: 'blob' }),

  // Bulk import — payload field name ("file") and the shape of a
  // per-row-validation-failure response are inferred (this backend action
  // uses maatwebsite/excel per vueportal's CLAUDE.md) and not confirmed
  // against the live controller. See the employee-master-data skill.
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post('/employee_master_data/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default employeeApi;
