import axios from "../../api/axiosInstance";

// Employee Master Data → Evaluation & Regularization: regularization
// interviews, one per interviewer — vueportal
// EmployeeRegularizationInterviewController. No getAll: read
// `regularization_interviews` off the employee row. Each call answers
// { success, message, regularization_interviews (the employee's full list,
// oldest first, each with `interviewer` { id, employee_code, first_name,
// last_name }), employee: { id, employment_type, regularization_date,
// regularization_interview_date, regularization_interview_status } } — the
// final interview (latest date) decides the overall result, and a Passed one
// regularizes a due employee. Validation failures are HTTP 422 with a
// { field: [messages] } bag.
const regularizationInterviewApi = {
  // body: { employee_id, interviewer_employee_id, interview_date (YYYY-MM-DD), result: 'Passed'|'Failed', remarks }
  create: (payload) => axios.post("/employee_master_data/regularization_interview/store", payload),
  update: (id, payload) => axios.post(`/employee_master_data/regularization_interview/update/${id}`, payload),
  remove: (id) => axios.post("/employee_master_data/regularization_interview/delete", { regularization_interview_id: id }),
};

export default regularizationInterviewApi;
