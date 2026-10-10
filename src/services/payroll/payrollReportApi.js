import axios from '../../api/axiosInstance';

// Payroll outputs and compliance — vueportal PayrollReportController +
// PayrollReportService (payroll_report.maintenance: payroll-report-view;
// final pay: final-pay-view; Administrator bypasses). Read from APPROVED
// payroll runs (register / bank file also preview a Draft).
// - register(runId) → { run, rows: [employee + figures], by_branch } ·
//   registerDownload(runId) → .xls (Register + By Branch).
// - bank(runId) → { run { status, source_account_id, match_employee_bank },
//   accounts (active company accounts), paid_from { match_employee_bank,
//   chosen, default, by_bank }, groups: [{ source_id ('none' = no company
//   account), source { bank_name, bank_code, account_no, account_name },
//   credit: [{ employee_code, full_name, account_no, account_name,
//   bank_name, amount }], total }], missing, not_positive, credit_count,
//   total, credit_date } · bankDownload(runId, sourceId) → one group's .csv
//   (approved runs only).
// - remittance({ year, month }) → { cutoffs, employees: [{ sss_no, sss_msc,
//   sss_ee, sss_er, sss_ec, philhealth_no, philhealth_base, philhealth_ee,
//   philhealth_er, pagibig_no, pagibig_base, pagibig_ee, pagibig_voluntary,
//   pagibig_er, tin_no, gross, non_taxable, taxable, tax, … }], totals,
//   employer } · remittanceDownload({ year, month }) → .xls.
// - annualization({ year }) → { employees: [annual row], totals, employer };
//   alphalistDownload({ year }) → .xls; certificate({ year, employee_id }) →
//   { employee, annual, employer } (BIR 2316).
// Annual row: { gross_compensation, thirteenth_month, benefits_exempt,
//   de_minimis, sss_ee, philhealth_ee, pagibig_ee, mandatory_contributions,
//   non_taxable, taxable, tax_due, tax_withheld, difference (+ still to
//   withhold, − refund), minimum_wage_earner, period_from / period_to }.
// - finalPayEmployees({ search }) · finalPay({ employee_id, last_day }) →
//   { statement: { employee, rate, paid_through, unpaid_from, earnings,
//   deductions, leave, gross, total_deductions, net, annual, employer,
//   warnings } }.
// Range reports — params { date_from, date_to (cut-offs ending in it, ≤ 1
// year), employee_ids, company_id, branch_id, position_id } (by the
// employee's current branch / position), approved payrolls only:
// - contributionHistory → { cutoffs, employees: [{ …employee, sss_ee, sss_er,
//   sss_ec, philhealth_ee, philhealth_er, pagibig_ee, pagibig_voluntary,
//   pagibig_er, tax, sss_total, philhealth_total, pagibig_total, ee_total,
//   er_total, lines: [per cut-off { cutoff, date_to, pay_date, sss_msc, … }] }],
//   totals }; contributionHistoryDownload → .xls (By Employee, By Cut-off, Summary).
// - paySheet → { cutoffs, employees (one line each, summed: register money
//   columns + cutoffs, company), by_company, by_branch, by_position,
//   by_cutoff [{ group, employees, … }], totals }; paySheetDownload → .xls.
// - payslips → { payslips: [{ payslip (+ employee.full_name), run { cutoff } }]
//   (≤ 500, else 422 { message }), employer } — for printing with payslipHtml.
const blob = { responseType: 'blob' };
const payrollReportApi = {
  register:           (runId)  => axios.post(`/payroll_report/register/${runId}`),
  registerDownload:   (runId)  => axios.post(`/payroll_report/register/download/${runId}`, {}, blob),
  bank:               (runId)  => axios.post(`/payroll_report/bank/${runId}`),
  bankDownload:       (runId, sourceId) => axios.post(`/payroll_report/bank/download/${runId}`, { source_id: sourceId }, blob),
  remittance:         (params) => axios.post('/payroll_report/remittance', params),
  remittanceDownload: (params) => axios.post('/payroll_report/remittance/download', params, blob),
  annualization:      (params) => axios.post('/payroll_report/annualization', params),
  alphalistDownload:  (params) => axios.post('/payroll_report/alphalist/download', params, blob),
  certificate:        (params) => axios.post('/payroll_report/certificate', params),
  finalPayEmployees:  (params) => axios.post('/payroll_report/final_pay/employees', params),
  finalPay:           (params) => axios.post('/payroll_report/final_pay', params),
  contributionHistory:         (params) => axios.post('/payroll_report/contribution_history', params),
  contributionHistoryDownload: (params) => axios.post('/payroll_report/contribution_history/download', params, blob),
  paySheet:           (params) => axios.post('/payroll_report/pay_sheet', params),
  paySheetDownload:   (params) => axios.post('/payroll_report/pay_sheet/download', params, blob),
  payslips:           (params) => axios.post('/payroll_report/payslips', params),
};

export default payrollReportApi;
