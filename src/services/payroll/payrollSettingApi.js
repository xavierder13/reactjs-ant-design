import axios from '../../api/axiosInstance';

// Payroll settings and premium rates — vueportal PayrollSettingController +
// PayrollSettingService (payroll_setting.maintenance; Administrator
// bypasses). The payroll run reads them (keeping its own copy per run).
// - show() → { setting: { daily_rate_factor, hours_per_day, night_diff_from
//   / night_diff_to ('22:00:00'), sss_deduction, philhealth_deduction,
//   pagibig_deduction, tax_deduction ('Every cut-off' | '1st cut-off' |
//   '2nd cut-off'), updater { name }, updated_at }, rates: [{ day_type,
//   regular_rate, overtime_rate, night_diff_rate, unworked_rate }] (8 day
//   types, DOLE order), deduction_schedules, daily_rate_factors }
//   (payroll-setting-view).
// - save({ daily_rate_factor, hours_per_day, night_diff_from 'HH:mm',
//   night_diff_to, sss_deduction, philhealth_deduction, pagibig_deduction,
//   tax_deduction }) / saveRates({ rates: [same as above] }) → 422 bag
//   (payroll-setting-edit).
const payrollSettingApi = {
  show:      ()        => axios.post('/payroll_setting/show'),
  save:      (payload) => axios.post('/payroll_setting/save', payload),
  saveRates: (rates)   => axios.post('/payroll_setting/rates/save', { rates }),
};

export default payrollSettingApi;
