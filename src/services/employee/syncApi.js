import axios from "../../api/axiosInstance";

// vueportal's manual triggers (its "Sync & Updates" menu in Home.vue), run
// from the sidebar's Human Resource → Sync & Updates. All GET in
// routes/api.php. Gates (backend middleware):
//   syncReferralCodes          careers-referral-list-sync   (RecruitmentMaintenance)
//   generateReferralCodes      Administrator role only      (EmployeeMasterDataMaintenance)
//   deactivateResigned         employee-master-data-deactivate
//   regularizePassed           employee-master-data-regularize
// Each answers { success, message } (referral sync passes the careers
// portal's own JSON through, or { error, details } on failure).
// The Overdue Deactivation / Regularization pages (POST, same gates as the
// two jobs): who the job would update — { employees: [...] } — and running
// it for chosen employees (`employeeIds`) → { success, message, processed }.
const syncApi = {
  syncReferralCodes:     () => axios.get("/recruitment/referral-sync"),
  generateReferralCodes: () => axios.get("/employee_master_data/generate_referral_codes"),
  deactivateResigned:    () => axios.get("/employee_master_data/deactivate_resigned_employees"),
  regularizePassed:      () => axios.get("/employee_master_data/regularize_passed_employees"),
  // rows: { id, employee_code, name, branch, position, employment_type, last_day_of_work, reason, days_overdue }
  overdueDeactivation:   () => axios.post("/employee_master_data/overdue_deactivation"),
  deactivateSelected:    (employeeIds) => axios.post("/employee_master_data/overdue_deactivation/run", { employee_ids: employeeIds }),
  // rows: { id, employee_code, name, branch, position, direct_hire_since, days_since, regularization_date,
  //         past_due, regularization_interview_date, regularization_interview_status }
  overdueRegularization: () => axios.post("/employee_master_data/overdue_regularization"),
  regularizeSelected:    (employeeIds) => axios.post("/employee_master_data/overdue_regularization/run", { employee_ids: employeeIds }),
};

export default syncApi;
