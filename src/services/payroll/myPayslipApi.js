import axios from '../../api/axiosInstance';

// Self-service payslips — vueportal MyPayslipController (auth only): the
// signed-in user's own payslips (the employee linked to their account) from
// approved payrolls; another employee's id is 404.
// - getAll() → { linked (account has an employee), payslips: [{ id, cutoff
//   { code, date_from, date_to, pay_date }, gross_pay, total_deductions,
//   net_pay }] } newest first.
// - show(id) → { payslip (same shape as payrollRunApi.payslip), run }.
const myPayslipApi = {
  getAll: ()   => axios.post('/my_payslip/index'),
  show:   (id) => axios.post(`/my_payslip/show/${id}`),
};

export default myPayslipApi;
