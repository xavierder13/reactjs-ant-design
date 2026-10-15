// Labels and kinds of the bracket columns (vueportal
// ContributionTable::ROW_FIELDS decides which apply to an agency).
export const FIELD_LABELS = {
  SSS:        { range_from: 'Salary From', range_to: 'Salary To', salary_credit: 'Salary Credit (MSC)', ee_amount: 'EE Share', er_amount: 'ER Share', ec_amount: 'EC' },
  PhilHealth: { range_from: 'Floor', range_to: 'Ceiling', ee_rate: 'EE %', er_rate: 'ER %' },
  'Pag-IBIG': { range_from: 'Salary From', range_to: 'Salary To', ee_rate: 'EE %', er_rate: 'ER %', max_base: 'Max Fund Salary' },
  BIR:        { range_from: 'Over', range_to: 'Not Over', fixed_tax: 'Fixed Tax', tax_rate: '% of Excess' },
  'BIR Semi-monthly': { range_from: 'Over', range_to: 'Not Over', fixed_tax: 'Fixed Tax', tax_rate: '% of Excess' },
  'BIR Annual':       { range_from: 'Over', range_to: 'Not Over', fixed_tax: 'Fixed Tax', tax_rate: '% of Excess' },
};

// 'BIR' is the monthly withholding tax table
const AGENCY_LABELS = { BIR: 'BIR Monthly' };
export const agencyLabel = (agency) => AGENCY_LABELS[agency] || agency;

export const RATE_FIELDS = ['ee_rate', 'er_rate', 'tax_rate'];

export const AGENCY_NOTES = {
  SSS: 'Monthly salary bracket → Monthly Salary Credit and fixed EE / ER / EC shares. Leave "Salary To" blank on the last line ("and above").',
  PhilHealth: 'One line: the premium base is the monthly salary kept between the floor and the ceiling; EE % and ER % of it.',
  'Pag-IBIG': 'Monthly salary bracket → EE % / ER % of the salary up to the max fund salary.',
  BIR: 'Monthly withholding tax on taxable compensation (after mandatory EE contributions): fixed tax + % of the excess over "Over". Used when tax is taken on the 1st / 2nd cut-off of the month (the month\'s pay), or every cut-off with monthly cut-offs.',
  'BIR Semi-monthly': 'Semi-monthly withholding tax: with tax taken every cut-off, each semi-monthly cut-off\'s own taxable pay (less the contributions deducted on it) — fixed tax + % of the excess over "Over".',
  'BIR Annual': 'Annual income tax: the year-end annualization and final pay compare it with the tax withheld in the year — still to withhold, or to refund. Fixed tax + % of the excess over "Over".',
};

// '1750.00' → '1,750.00'; '2.500' → '2.5%'
export const formatCell = (field, value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (RATE_FIELDS.includes(field)) return `${Number(value)}%`;
  return Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
