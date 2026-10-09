import axios from '../../api/axiosInstance';

// Payroll settings and premium rates — vueportal PayrollSettingController +
// PayrollSettingService (payroll_setting.maintenance; Administrator
// bypasses). The payroll run reads them (keeping its own copy per run).
// - show() → { setting: { daily_rate_factor, hours_per_day, night_diff_from
//   / night_diff_to ('22:00:00'), sss_deduction, philhealth_deduction,
//   pagibig_deduction, tax_deduction ('Every cut-off' | '1st cut-off' |
//   '2nd cut-off'), cutoff_first_day / cutoff_second_day (1–28: where each
//   semi-monthly cut-off starts), pay_day_first / pay_day_second (0 = last
//   day of the month), pay_day_adjust ('Previous working day' | 'Next
//   working day' | 'None' — off a Sunday / holiday),
//   holiday_pay_needs_prior_day (bool), ot_minimum_minutes (0–240),
//   ot_rounding_minutes (1|5|10|15|30|60 — approved overtime rounded down),
//   updater { name }, updated_at },
//   rates: [{ day_type, regular_rate, overtime_rate, night_diff_rate,
//   unworked_rate }] (8 day types, DOLE order), deduction_schedules,
//   daily_rate_factors, pay_day_adjustments } (payroll-setting-view).
// - save({ every setting field above, times 'HH:mm' }) / saveRates({ rates:
//   [same as above] }) → 422 bag (payroll-setting-edit).
const payrollSettingApi = {
  show:      ()        => axios.post('/payroll_setting/show'),
  save:      (payload) => axios.post('/payroll_setting/save', payload),
  saveRates: (rates)   => axios.post('/payroll_setting/rates/save', { rates }),
};

export default payrollSettingApi;
