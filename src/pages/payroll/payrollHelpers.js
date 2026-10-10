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

export const employeeName = (r) => `${r.last_name}, ${r.first_name}${r.middle_name ? ` ${r.middle_name}` : ''}`;

export const MODE_COLORS = { Computed: 'default', Fixed: 'blue', Exempt: 'orange' };

export const DEDUCTION_STATUS_COLORS = { Active: 'green', 'On Hold': 'gold', 'Fully Paid': 'blue', Cancelled: 'default' };

export const RETRO_STATUS_COLORS = { Open: 'green', Applied: 'blue', Cancelled: 'default' };

export const ADJUSTMENT_COLORS = { Earning: 'green', Deduction: 'volcano' };

// A retro's name as the payslip shows it: the type, or what an Other
// Adjustment is for (+ the allowance, or the text typed for Others).
// Takes a list row (allowance_type_name) or a full retro (allowance_type).
export const retroLabel = (r) => {
  if (r.retro_type !== 'Other Adjustment' || !r.other_type) return r.retro_type;
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
