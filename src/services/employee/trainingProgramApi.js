import axios from "../../api/axiosInstance";

// Employee Master Data → Training tab (HR-encoded training programs) —
// vueportal EmployeeTrainingProgramController. Not the Performance
// Management "Training" ratings (trainingApi.js). No getAll: read
// `training_programs` off the employee row. Each call answers
// { success, message, training_programs } (the employee's full list);
// validation failures are HTTP 422 with a { field: [messages] } bag.
const trainingProgramApi = {
  // body: { employee_id, title, training_type, provider, department_id, provider_name,
  //         delivery_method, training_date (YYYY-MM-DD), location, training_fee }
  create: (payload) => axios.post("/employee_master_data/training_program/store", payload),
  update: (id, payload) => axios.post(`/employee_master_data/training_program/update/${id}`, payload),
  remove: (id) => axios.post("/employee_master_data/training_program/delete", { training_program_id: id }),
};

export default trainingProgramApi;
