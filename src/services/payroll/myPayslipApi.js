import axios from '../../api/axiosInstance';

// Self-service payslips — vueportal MyPayslipController (auth only): the
// signed-in user's own payslips (the employee linked to their account) from
// approved payrolls; another employee's id is 404.
// - getAll() → { linked (account has an employee), payslips: [{ id, cutoff
//   { code, date_from, date_to, pay_date }, gross_pay, total_deductions,
//   net_pay }] } newest first.
// - show(id) → { payslip (same shape as payrollRunApi.payslip), run }.
// Range calls take { date_from, date_to } (approved cut-offs ENDING in it;
// a cut-off range = first cut-off's start → last one's end; ≤ 1 year):
// - paySheet → { lines: [{ payslip_id, cutoff, pay_basis, basic_rate, …the
//   register money columns }] oldest first, totals }; paySheetDownload → .xls.
// - payslips → { payslips: [{ payslip, run { cutoff } }], employer } — for
//   printing in one go (same shape as payrollReportApi.payslips).
const myPayslipApi = {
  getAll: ()   => axios.post('/my_payslip/index'),
  show:   (id) => axios.post(`/my_payslip/show/${id}`),
  paySheet:         (params) => axios.post('/my_payslip/pay_sheet', params),
  paySheetDownload: (params) => axios.post('/my_payslip/pay_sheet/download', params, { responseType: 'blob' }),
  payslips:         (params) => axios.post('/my_payslip/payslips', params),
};

export default myPayslipApi;
