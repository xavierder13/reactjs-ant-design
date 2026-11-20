import axios from "../../api/axiosInstance";

// Referral Codes list — vueportal EmployeeReferralController, gated by
// `employee-referral-list` / `employee-referral-view-referrals`
// (EmployeeMasterDataMaintenance).
const employeeReferralApi = {
  // POST /api/employee_master_data/referral_codes?page=N
  // body: { search, status: 'Active'|'Inactive', code_status: 'Active'|'Inactive'|'None', branch_id,
  //         has_referrals: 1 (needs employee-referral-view-referrals), items_per_page }
  // → { success, employees: <Laravel paginator of { id, employee_code, first_name, middle_name, last_name,
  //     active, branch, position, referral_code, referral_is_active, referral_count? }>, branches: [{ id, name }],
  //     referrals_error: string|null }
  // `referral_count` (careers-portal applicants at any stage who entered the
  // code) is only present for users with employee-referral-view-referrals.
  getAll: (payload, page = 1) => axios.post(`/employee_master_data/referral_codes?page=${page}`, payload),

  // POST /api/employee_master_data/referral_codes/referrals  body: { employee_id }
  // → { success, employee: { id, employee_code, names, branch, position, referral_code },
  //     applicants: [All Applicants rows from the careers portal, scoped to the user] }
  // POST /api/employee_master_data/referral_codes/referred (employee-referral-view-referrals)
  // → { success, applicants: [All Applicants rows with a referral_code, each plus
  //     referrer: { id, employee_code, names, active, branch, position, referral_code, referral_is_active } | null,
  //     employee_id: the synced employee (employee_code careers-<applicant id>) | null] }
  getReferred: () => axios.post("/employee_master_data/referral_codes/referred"),

  // POST /api/employee_master_data/referral_codes/referred_employees?page=N (employee-referral-employee-list)
  // body: { view: 'referrer'|'employee', search, status: 'Active'|'Inactive', branch_id, employment_type,
  //         date_from, date_to (date employed, YYYY-MM-DD), group_key: 'E<referrer id>'|'C<CODE>', items_per_page }
  // → { success, rows: <Laravel paginator>, branches: [{ id, name }], employment_types: [string] }
  //   employee rows: { id, employee_code, names, active, employment_type, date_employed, date_resigned,
  //     regularization_date, branch, position, referred_by_code, referred_by_employee_id, referrer_* }
  //   referrer rows: { group_key, referrer_id, referred_by_code, referrer_* , total, active_count, regular_count }
  getReferredEmployees: (payload, page = 1) => axios.post(`/employee_master_data/referral_codes/referred_employees?page=${page}`, payload),

  getReferrals: (employeeId) => axios.post("/employee_master_data/referral_codes/referrals", { employee_id: employeeId }),
};

export default employeeReferralApi;
