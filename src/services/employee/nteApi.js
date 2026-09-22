import axios from "../../api/axiosInstance";

// Employee Master Data's "Issued NTE" (Notice to Explain) sub-record.
// Route source of truth: vueportal routes/api.php, prefix
// `employee_master_data/nte`, backed by `EmployeeNTEController` /
// `App\EmployeeExplanation` (the response key is `explanations`, not
// `nte` — matches the model name, confirmed from the controller).
//
// Same shape/caveats as disciplinaryApi.js: `index()` is a global
// cross-employee open-cases queue, not used here (this tab reads
// `explanations` off the employee record itself); create/update are
// multipart; a file already present is silently kept on update (delete it
// first to replace it). NTE additionally carries **two independent
// files** per record (`nte_file` and `explanation_file`) — every
// file-scoped action needs `document_type: 'nte_file' | 'explanation_file'`
// to say which one.
const nteApi = {
  // POST /api/employee_master_data/nte/store (multipart)
  // fields: employee_id, date_issued (YYYY-MM-DD), issued_by, nte_code,
  // violation, explanation_date?, remarks?, status?,
  // nte_file?, explanation_file? (both: jpeg/jpg/png/docs/docx/pdf, max 10MB)
  create: (formData) => axios.post('/employee_master_data/nte/store', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // POST /api/employee_master_data/nte/update/:id (multipart, same fields)
  update: (id, formData) => axios.post(`/employee_master_data/nte/update/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // POST /api/employee_master_data/nte/delete
  // body: { explanation_id }
  remove: (explanationId) => axios.post('/employee_master_data/nte/delete', { explanation_id: explanationId }),

  // POST /api/employee_master_data/nte/file_download
  // body: { explanation_id, document_type: 'nte_file' | 'explanation_file' }
  fileDownload: (explanationId, documentType) => axios.post('/employee_master_data/nte/file_download', { explanation_id: explanationId, document_type: documentType }, { responseType: 'blob' }),

  // POST /api/employee_master_data/nte/file_delete
  // body: { explanation_id, document_type: 'nte_file' | 'explanation_file' }
  fileDelete: (explanationId, documentType) => axios.post('/employee_master_data/nte/file_delete', { explanation_id: explanationId, document_type: documentType }),
};

export default nteApi;
