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
const syncApi = {
  syncReferralCodes:     () => axios.get("/recruitment/referral-sync"),
  generateReferralCodes: () => axios.get("/employee_master_data/generate_referral_codes"),
  deactivateResigned:    () => axios.get("/employee_master_data/deactivate_resigned_employees"),
  regularizePassed:      () => axios.get("/employee_master_data/regularize_passed_employees"),
};

export default syncApi;
