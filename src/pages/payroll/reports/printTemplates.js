import dayjs from 'dayjs';
import { escapeHtml as h } from '../../../utils/printDocument';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';

// HTML for the documents printed with utils/printDocument: the payslip, the
// BIR 2316 (certificate of compensation and tax withheld — data layout, not
// the official form) and the final pay statement.

const money = (v) => Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (v) => (v ? dayjs(v).format(DISPLAY_DATE_FORMAT) : '—');
const or = (v) => h(v || '—');

const employerHead = (employer, title, subtitle) => `
  <div class="head">
    <div>
      <h1>${or(employer?.name || 'Employer name not set')}</h1>
      <div class="muted">${h([employer?.address, employer?.zip].filter(Boolean).join(' ') || 'Set the employer details in Payroll Settings')}</div>
      ${employer?.tin ? `<div class="muted">TIN ${h(employer.tin)}${employer.rdo ? ` · RDO ${h(employer.rdo)}` : ''}</div>` : ''}
    </div>
    <div class="right"><div class="strong" style="font-size:13pt">${h(title)}</div><div class="muted">${h(subtitle)}</div></div>
  </div>`;

const linesTable = (lines, totalLabel, total) => `
  <table>
    ${lines.map((l) => `<tr><td>${h(l.label)}${l.detail?.length ? `<div class="muted">${h(l.detail.slice(0, 4).join(' · '))}</div>` : ''}</td><td class="right">${money(l.amount)}</td></tr>`).join('')}
    ${lines.length ? '' : '<tr><td class="muted">None</td><td></td></tr>'}
    <tr class="total"><td>${h(totalLabel)}</td><td class="right">${money(total)}</td></tr>
  </table>`;

// payslip = payroll_run/employee or my_payslip/show `payslip`; run = its run.
export const payslipHtml = (p, run, employer) => {
  const e = p.employee || {};
  const c = run.cutoff || {};
  const s = p.summary || {};
  return `
    ${employerHead(employer, 'PAYSLIP', `${c.code || ''} · ${date(c.date_from)} – ${date(c.date_to)}`)}
    <table style="margin-bottom:8px">
      <tr><td style="width:15%" class="muted">Employee</td><td class="strong">${or(e.full_name)}</td><td style="width:15%" class="muted">Pay Date</td><td>${date(c.pay_date)}</td></tr>
      <tr><td class="muted">Code</td><td>${or(e.employee_code)}</td><td class="muted">Rate</td><td>${money(p.basic_rate)} ${p.pay_basis === 'Daily' ? '/ day' : '/ month'}</td></tr>
      <tr><td class="muted">Branch</td><td>${or(e.branch?.name)}</td><td class="muted">Position</td><td>${or(e.position?.name)}</td></tr>
    </table>
    <div class="muted">Days present ${h(s.present ?? '—')} · absent ${h(Number(s.absent_days || 0))} · late ${h(s.late_minutes || 0)} min · undertime ${h(s.undertime_minutes || 0)} min · overtime ${h(s.ot_minutes || 0)} min</div>
    <div class="cols">
      <div><h2>Earnings</h2>${linesTable(p.earnings || [], 'Gross Pay', p.gross_pay)}</div>
      <div><h2>Deductions</h2>${linesTable(p.deductions || [], 'Total Deductions', p.total_deductions)}</div>
    </div>
    <div class="box" style="display:flex;justify-content:space-between;font-size:13pt"><span class="strong">NET PAY</span><span class="strong">₱ ${money(p.net_pay)}</span></div>
    ${p.employer?.length ? `<div class="muted">Employer share (not deducted): ${p.employer.map((l) => `${h(l.label)} ${money(l.amount)}`).join(' · ')}</div>` : ''}
    <div class="sign"><div>Prepared by</div><div>Received by (employee)</div></div>
    <div class="muted" style="margin-top:10px">This is a system-generated payslip.</div>`;
};

// certificate = payroll_report/certificate { employee, annual, employer }.
export const certificate2316Html = ({ employee: e, annual: a, employer }) => {
  const row = (label, value, strong) => `<tr${strong ? ' class="total"' : ''}><td>${h(label)}</td><td class="right">${money(value)}</td></tr>`;
  const name = [e.last_name, e.first_name, e.middle_name].filter(Boolean).join(', ');
  return `
    ${employerHead(employer, 'BIR Form 2316', `Certificate of Compensation Payment / Tax Withheld — ${a.year}`)}
    <div class="muted" style="margin-bottom:6px">Data for the BIR form, from the year's approved payrolls; transfer onto the official form.</div>
    <h2>Part I — Employee</h2>
    <table class="grid">
      <tr><th style="width:22%">Name</th><td>${h(name)}</td><th style="width:18%">TIN</th><td>${or(e.tin_no)}</td></tr>
      <tr><th>Address</th><td>${or(e.address)}</td><th>Date of Birth</th><td>${date(e.dob)}</td></tr>
      <tr><th>Period</th><td>${date(a.period_from)} – ${date(a.period_to)}</td><th>Minimum Wage Earner</th><td>${a.minimum_wage_earner ? 'Yes' : 'No'}</td></tr>
    </table>
    <h2>Part II — Employer</h2>
    <table class="grid">
      <tr><th style="width:22%">Name</th><td>${or(employer?.name)}</td><th style="width:18%">TIN</th><td>${or(employer?.tin)}</td></tr>
      <tr><th>Address</th><td colspan="3">${h([employer?.address, employer?.zip].filter(Boolean).join(' ') || '—')}</td></tr>
    </table>
    <div class="cols">
      <div>
        <h2>Non-taxable / Exempt Compensation</h2>
        <table>
          ${row('13th month pay and other benefits (up to ₱90,000)', a.benefits_exempt)}
          ${row('De minimis and other non-taxable earnings', a.de_minimis)}
          ${row('SSS, PhilHealth, Pag-IBIG (employee share)', a.mandatory_contributions)}
          ${row('Total non-taxable compensation', a.non_taxable, true)}
        </table>
      </div>
      <div>
        <h2>Taxable Compensation</h2>
        <table>
          ${row('Gross compensation', a.gross_compensation)}
          ${row('Less: non-taxable', a.non_taxable)}
          ${row('Taxable compensation', a.taxable, true)}
        </table>
      </div>
    </div>
    <h2>Summary</h2>
    <table>
      ${row('Tax due', a.tax_due)}
      ${row('Tax withheld', a.tax_withheld)}
      ${row(a.difference >= 0 ? 'Still to withhold' : 'To refund', Math.abs(a.difference), true)}
    </table>
    ${a.note ? `<div class="muted" style="margin-top:6px">${h(a.note)}</div>` : ''}
    <div class="sign"><div>Employer / authorized agent</div><div>Employee</div></div>`;
};

// statement = payroll_report/final_pay `statement`.
export const finalPayHtml = (st) => {
  const e = st.employee;
  return `
    ${employerHead(st.employer, 'FINAL PAY', `Last day ${date(e.last_day)}`)}
    <table style="margin-bottom:8px">
      <tr><td style="width:15%" class="muted">Employee</td><td class="strong">${or(e.full_name)}</td><td style="width:18%" class="muted">Date Employed</td><td>${date(e.date_employed)}</td></tr>
      <tr><td class="muted">Code</td><td>${or(e.employee_code)}</td><td class="muted">Rate</td><td>${money(st.rate.basic_rate)} ${st.rate.pay_basis === 'Daily' ? '/ day' : '/ month'} (daily ${money(st.rate.daily_rate)})</td></tr>
      <tr><td class="muted">Branch</td><td>${or(e.branch)}</td><td class="muted">Paid Through</td><td>${date(st.paid_through)}</td></tr>
    </table>
    <div class="cols">
      <div><h2>Earnings</h2>${linesTable(st.earnings, 'Total', st.gross)}</div>
      <div><h2>Deductions</h2>${linesTable(st.deductions, 'Total', st.total_deductions)}</div>
    </div>
    <div class="box" style="display:flex;justify-content:space-between;font-size:13pt"><span class="strong">NET FINAL PAY</span><span class="strong">₱ ${money(st.net)}</span></div>
    <div class="muted">Year-end tax: due ${money(st.annual.tax_due)}, withheld ${money(st.annual.tax_withheld)}. A BIR 2316 for ${h(st.annual.year)} is issued with this final pay.</div>
    <div class="sign"><div>Prepared by</div><div>Approved by</div><div>Received by (employee)</div></div>`;
};
