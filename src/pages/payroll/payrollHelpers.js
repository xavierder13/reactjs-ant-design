import dayjs from 'dayjs';
import { DISPLAY_DATE_FORMAT } from '../../utils/formatDate';

export { peso } from '../compensation/compensationHelpers';

// InputNumber props for peso amounts: ₱ prefix, 2 decimals, thousands commas.
export const pesoInputProps = {
  prefix: '₱',
  min: 0,
  precision: 2,
  style: { width: '100%' },
  formatter: (v) => (v === undefined || v === null || v === '' ? '' : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')),
  parser: (v) => (v ? v.replace(/,/g, '') : ''),
};

// 'n.nn' → number for an InputNumber; null stays null.
export const toNumber = (value) => (value === null || value === undefined || value === '' ? null : Number(value));

// '2026-10-A (10/01 – 10/15/2026)'
export const cutoffLabel = (c) => (c
  ? `${c.code} (${dayjs(c.date_from).format('MM/DD')} – ${dayjs(c.date_to).format(DISPLAY_DATE_FORMAT)})`
  : '-');

export const cutoffOptions = (cutoffs = []) => cutoffs.map((c) => ({ value: c.id, label: cutoffLabel(c) }));

// Working days a year (daily-rate factor) → when to use it.
export const FACTOR_HINTS = {
  261: '5-day work week (Sat & Sun off)',
  313: '6-day work week (Sunday off)',
  314.6: 'DOLE default',
  315: '26.25 days a month',
  365: 'paid every day of the year',
};

// The Payroll Settings an assignment can override (Payroll Settings →
// Assigned Settings; the payslip's summary.settings_from uses the same keys).
export const ASSIGNED_SETTING_FIELDS = [
  { key: 'daily_rate_factor', label: 'Working days a year' },
  { key: 'hours_per_day', label: 'Hours per day' },
  { key: 'night_diff_enabled', label: 'Night differential' },
  { key: 'night_diff_from', label: 'Night diff. from' },
  { key: 'night_diff_to', label: 'Night diff. to' },
  { key: 'sss_deduction', label: 'SSS' },
  { key: 'philhealth_deduction', label: 'PhilHealth' },
  { key: 'pagibig_deduction', label: 'Pag-IBIG' },
  { key: 'tax_deduction', label: 'Withholding Tax' },
];

// Who assigned settings apply to, most specific first.
export const ASSIGN_SCOPES = [
  { value: 'employee', label: 'Employee' },
  { value: 'position', label: 'Position' },
  { value: 'branch', label: 'Branch' },
  { value: 'company', label: 'Company' },
];
export const assignScopeLabel = (scope) => ASSIGN_SCOPES.find((s) => s.value === scope)?.label || scope || '';

// An assigned setting's value for display ('315 days', '9 h', '1st cut-off').
export const settingValueText = (key, value) => {
  if (value === null || value === undefined) return null;
  if (key === 'daily_rate_factor') return `${Number(value)} days`;
  if (key === 'hours_per_day') return `${Number(value)} h`;
  if (key === 'night_diff_enabled') return value ? 'On' : 'Off';
  if (key === 'night_diff_from' || key === 'night_diff_to') return String(value).slice(0, 5);
  return value;
};

export const employeeName = (r) => `${r.last_name}, ${r.first_name}${r.middle_name ? ` ${r.middle_name}` : ''}`;

export const MODE_COLORS = { Computed: 'default', Fixed: 'blue', Exempt: 'orange' };

export const DEDUCTION_STATUS_COLORS = { Active: 'green', 'On Hold': 'gold', 'Fully Paid': 'blue', Cancelled: 'default' };

export const ADJUSTMENT_STATUS_COLORS = { Open: 'green', Applied: 'blue', Cancelled: 'default' };

export const ADJUSTMENT_COLORS = { Earning: 'green', Deduction: 'volcano' };

// An adjustment's name as the payslip shows it: the type, or what an Other
// Adjustment is for (+ the allowance, or the text typed for Others).
// Takes a list row (allowance_type_name) or a full adjustment (allowance_type).
export const adjustmentLabel = (r) => {
  if (r.adjustment_type !== 'Other Adjustment' || !r.other_type) return r.adjustment_type;
  if (r.other_type === 'Others (specify)') return r.other_specify || 'Other Adjustment';
  const allowance = r.allowance_type_name || r.allowance_type?.name;
  return `${r.other_type}${allowance ? ` (${allowance})` : ''}`;
};

// 422 bag → inline field errors (fieldFor maps an API field to the form
// field, e.g. period_from → period); a { message } → toast.
export const applyFormErrors = (error, form, message, handleApiError, fieldFor = (k) => k) => {
  const data = error.response?.status === 422 ? error.response.data : null;
  if (data && !data.message) {
    form.setFields(Object.entries(data).map(([name, errors]) => ({ name: fieldFor(name), errors: [].concat(errors) })));
    return;
  }
  handleApiError(error, message);
};
