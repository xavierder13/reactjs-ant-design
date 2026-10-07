import axios from "../../api/axiosInstance";

// Referral Codes list — vueportal EmployeeReferralController@index, gated by
// `employee-referral-list` (EmployeeMasterDataMaintenance).
const employeeReferralApi = {
  // POST /api/employee_master_data/referral_codes?page=N
  // body: { search, status: 'Active'|'Inactive', code_status: 'Active'|'Inactive'|'None', branch_id, items_per_page }
  // → { success, employees: <Laravel paginator of { id, employee_code, first_name, middle_name, last_name,
  //     active, branch, position, referral_code, referral_is_active }>, branches: [{ id, name }] }
  getAll: (payload, page = 1) => axios.post(`/employee_master_data/referral_codes?page=${page}`, payload),
};

export default employeeReferralApi;
