import axios from '../../api/axiosInstance';

// Payroll cut-offs — vueportal PayrollCutoffController + PayrollCutoffService
// (payroll_cutoff.maintenance; Administrator bypasses). Periods never
// overlap. The filing switch (`filing_open`): while OFF, leave and manual
// time entries can't be filed, edited or approved for any date inside the
// period (LeaveService / TimeEntryService → "Filing is turned off for
// payroll cut-off …"); disapprove / cancel still work, except cancelling an
// approved one inside a payroll waiting for approval or approved (only an
// Administrator). Submitting a payroll turns it OFF; approving keeps it OFF.
// - getAll({ year }) → { cutoffs: [{ id, code, date_from, date_to, pay_date,
//   filing_open, remarks }] } (payroll-cutoff-list).
// - create / update(id) { code, date_from, date_to, pay_date, remarks } → 422
//   bag (code unique, end ≥ start, pay ≥ end, "Overlaps cut-off X"); dates
//   can't change and delete is refused while filing is OFF (422 { message }).
// - generate({ year, pattern: 'semi-monthly'|'monthly', update_pay_dates })
//   → { message, result: { created, skipped, updated } } — periods and pay
//   days from Payroll Settings' cut-off rules (payroll-cutoff-create).
// - toggle(id, filing_open, reason) — reason required to turn OFF →
//   { message, cutoff } (payroll-cutoff-filing-toggle). logs(id) → { logs:
//   [{ filing_open, reason, changer { name }, created_at }] }.
const payrollCutoffApi = {
  getAll:   (params)                    => axios.post('/payroll_cutoff/index', params),
  create:   (payload)                   => axios.post('/payroll_cutoff/store', payload),
  update:   (id, payload)               => axios.post(`/payroll_cutoff/update/${id}`, payload),
  delete:   (id)                        => axios.post(`/payroll_cutoff/delete/${id}`),
  generate: (payload)                   => axios.post('/payroll_cutoff/generate', payload),
  toggle:   (id, filingOpen, reason)    => axios.post(`/payroll_cutoff/toggle/${id}`, { filing_open: filingOpen, reason }),
  logs:     (id)                        => axios.post(`/payroll_cutoff/logs/${id}`),
};

export default payrollCutoffApi;
