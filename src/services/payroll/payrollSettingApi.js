import axios from '../../api/axiosInstance';

// Payroll settings and premium rates — vueportal PayrollSettingController +
// PayrollSettingService (payroll_setting.maintenance; Administrator
// bypasses). The payroll run reads them (keeping its own copy per run).
// - show() → { setting: { daily_rate_factor, hours_per_day, night_diff_from
//   / night_diff_to ('22:00:00'), night_diff_enabled (bool, default true), sss_deduction, philhealth_deduction,
//   pagibig_deduction, tax_deduction ('Every cut-off' | '1st cut-off' |
//   '2nd cut-off'), cutoff_first_day / cutoff_second_day (1–28: where each
//   semi-monthly cut-off starts), pay_day_first / pay_day_second (0 = last
//   day of the month), pay_day_adjust ('Previous working day' | 'Next
//   working day' | 'None' — off a Sunday / holiday),
//   holiday_pay_needs_prior_day (bool), ot_minimum_minutes (0–240),
//   ot_rounding_minutes (1|5|10|15|30|60 — approved overtime rounded down),
//   payslip_show_employer_share (bool, default false — the employer share
//   on employees' payslips: printed, My Payslips, their pay sheet),
//   match_employee_bank (bool — pay each
//   bank's employees from the company account at that bank),
//   updater { name }, updated_at },
//   rates: [{ day_type, regular_rate, overtime_rate, night_diff_rate,
//   unworked_rate }] (8 day types, DOLE order), deduction_schedules,
//   daily_rate_factors, pay_day_adjustments, banks: [{ id, code, name,
//   active }], accounts: [{ id, company_id (null = general — the fallback for
//   a company with none), company { name }, bank_id, bank { code, name },
//   account_name, account_no, is_default, default_from, default_to, active,
//   remarks }],
//   employers: [{ id (company), company_name, active, registered_name, tin,
//   rdo, address, zip, sss_no, philhealth_no, pagibig_no }] (active
//   companies + inactive ones with details) } (payroll-setting-view).
// - employerUpdate(companyId, { registered_name (blank = the company name),
//   tin (digits / dashes), rdo, address, zip, sss_no, philhealth_no,
//   pagibig_no }) → { message, employers } | 422 bag (payroll-setting-edit;
//   audit trail 'Employer (company)').
// - accountStore / accountUpdate(id) { company_id (null = general), bank_id,
//   account_name, account_no, is_default, default_from, default_to, active,
//   remarks } → 422 bag or { message } (within one company — or among the
//   general accounts — default periods can't overlap and one is_default);
//   accountDelete(id) — refused while a payout waiting for approval uses it
//   (payroll-setting-edit).
// - save({ every setting field above, times 'HH:mm' }) / saveRates({ rates:
//   [same as above] }) → 422 bag (payroll-setting-edit).
// - Assigned settings (PayrollSettingAssignmentController): an employee /
//   position / branch / company's own daily_rate_factor, hours_per_day,
//   night_diff_enabled (false needs a reason),
//   sss / philhealth / pagibig / tax_deduction (null = the next level:
//   employee → position → branch → company → Payroll Settings) for a
//   coverage: 'cutoffs' (start_cutoff_id..end_cutoff_id) or 'dates'
//   (date_from..date_to) — the cut-offs ending inside it.
//   assignmentIndex({ scope?, status: Active | Cancelled | All }) →
//   { assignments: [{ id, scope, scope_id, scope_name, coverage,
//   start_cutoff_id / end_cutoff_id + start_cutoff / end_cutoff { code,
//   date_from, date_to } (cutoffs), effective_date, end_date, …fields,
//   reason, status, creator / canceller { name }, cancel_reason }] };
//   assignmentOptions() → { companies, branches, positions, cutoffs,
//   daily_rate_factors, deduction_schedules } (payroll-setting-view).
//   assignmentStore / assignmentUpdate(id) { scope, scope_id, coverage,
//   start_cutoff_id + end_cutoff_id | date_from + date_to, …fields, reason }
//   (scope / scope_id fixed on update) → 422 bag or { message } (at least
//   one field; the first cut-off covered not approved / pending; one
//   target's coverages can't cover the same cut-off);
//   assignmentCancel(id, reason) (payroll-setting-edit).
//   Bulk (several employees, one row each, all or nothing — like Group
//   Shift Allocation): assignmentCandidates({ branch_id?, search? }) →
//   { employees: [{ id, employee_code, full_name, position, branch }],
//   needs_filter }; assignmentBulkPreview / assignmentBulkStore({
//   employee_ids (≤ 500), coverage …, …fields, reason }) → preview
//   { error (cut-off / no field), errors: { employee_id: why } }; store 422
//   { message, errors } when any can't, else { message, count }.
const payrollSettingApi = {
  show:      ()        => axios.post('/payroll_setting/show'),
  save:      (payload) => axios.post('/payroll_setting/save', payload),
  saveRates: (rates)   => axios.post('/payroll_setting/rates/save', { rates }),
  accountStore:  (payload)     => axios.post('/payroll_setting/accounts/store', payload),
  accountUpdate: (id, payload) => axios.post(`/payroll_setting/accounts/update/${id}`, payload),
  accountDelete: (id)          => axios.post(`/payroll_setting/accounts/delete/${id}`),
  employerUpdate: (companyId, payload) => axios.post(`/payroll_setting/employers/update/${companyId}`, payload),
  assignmentIndex:   (params)      => axios.post('/payroll_setting/assignments/index', params),
  assignmentOptions: ()            => axios.post('/payroll_setting/assignments/options'),
  assignmentStore:   (payload)     => axios.post('/payroll_setting/assignments/store', payload),
  assignmentUpdate:  (id, payload) => axios.post(`/payroll_setting/assignments/update/${id}`, payload),
  assignmentCancel:  (id, reason)  => axios.post(`/payroll_setting/assignments/cancel/${id}`, { reason }),
  assignmentCandidates:  (params)  => axios.post('/payroll_setting/assignments/candidates', params),
  assignmentBulkPreview: (payload) => axios.post('/payroll_setting/assignments/bulk_preview', payload),
  assignmentBulkStore:   (payload) => axios.post('/payroll_setting/assignments/bulk_store', payload),
};

export default payrollSettingApi;
