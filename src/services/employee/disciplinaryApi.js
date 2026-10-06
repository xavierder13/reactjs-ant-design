import axios from "../../api/axiosInstance";

// Employee Master Data's "Disciplinary Actions" sub-record.
// Route source of truth: vueportal routes/api.php, prefix
// `employee_master_data/disciplinary`.
//
// Unlike every Performance Management sub-module, this one DOES have a
// working `index()` — but it's a **global, cross-employee queue** of open
// disciplinary cases (scoped by manager hierarchy), not a per-employee
// list — it backs a separate "Disciplinary Actions" queue view, not this
// tab. This tab instead reads `disciplinaries` off the employee record
// itself (eager-loaded on every `/employee_master_data/index` row), same
// as the Performance Management sub-modules. The queue is exposed only as
// `getOpenQueue`, for the Workforce Dashboard's open-cases count.
//
// create/update are multipart (a `file` field rides alongside the other
// fields, matching employeeApi.fileUpload's FormData pattern) — NOT
// axios.post(url, plainObjectPayload) like every other sub-module in this
// app. IMPORTANT, confirmed from the controller: once a record has a file,
// re-uploading a new one via update() is silently ignored server-side
// (`if (!$disciplinary->file_name) { ...set file... }`) — delete the
// existing file first (fileDelete) before a replacement will actually
// take effect.
const disciplinaryApi = {
  // GET /api/employee_master_data/disciplinary/index — global open-cases queue
  // (response key `disciplinaries`); used only for the dashboard count.
  getOpenQueue: () => axios.get('/employee_master_data/disciplinary/index'),

  // POST /api/employee_master_data/disciplinary/store (multipart)
  // fields: employee_id, date_issued (YYYY-MM-DD), nte_code, offense_code,
  // offense, offense_type, disciplinary_action, series, status,
  // transmit_date?, return_date?, file? (jpeg/jpg/png/docs/docx/pdf, max 10MB)
  create: (formData) => axios.post('/employee_master_data/disciplinary/store', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // POST /api/employee_master_data/disciplinary/update/:id (multipart, same fields)
  update: (id, formData) => axios.post(`/employee_master_data/disciplinary/update/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // POST /api/employee_master_data/disciplinary/delete
  // body: { disciplinary_id }
  remove: (disciplinaryId) => axios.post('/employee_master_data/disciplinary/delete', { disciplinary_id: disciplinaryId }),

  // POST /api/employee_master_data/disciplinary/file_download
  // body: { disciplinary_id }
  fileDownload: (disciplinaryId) => axios.post('/employee_master_data/disciplinary/file_download', { disciplinary_id: disciplinaryId }, { responseType: 'blob' }),

  // POST /api/employee_master_data/disciplinary/file_delete
  // body: { disciplinary_id }
  fileDelete: (disciplinaryId) => axios.post('/employee_master_data/disciplinary/file_delete', { disciplinary_id: disciplinaryId }),

  // Bulk create/update (Generate Template → fill → Import Data):
  // POST /api/employee_master_data/disciplinary/template/download → .xls blob
  // (params as vueportal's TemplateDownloadDialog.vue sends them), and
  // POST .../disciplinary/import (multipart "file") — HTTP 200 with
  // success | error_column | error_row_data+field_values | error_empty |
  // error; see ImportDataModal.jsx.
  templateDownload: (params = {}) => axios.post("/employee_master_data/disciplinary/template/download", params, { responseType: "blob" }),
  import: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return axios.post("/employee_master_data/disciplinary/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export default disciplinaryApi;
