import { Table } from 'antd';
import { peso } from '../payrollHelpers';
import { money, sumOf } from './reportHelpers';
import { formatDate } from '../../../utils/formatDate';

// Columns shared by the Contribution History page (one row per employee)
// and the per-employee History modal (one row per cut-off): the amounts of
// payroll_report/contribution_history, grouped per agency.
export const CONTRIBUTION_AMOUNTS = [
  { title: 'SSS', children: [['EE', 'sss_ee'], ['ER', 'sss_er'], ['EC', 'sss_ec']] },
  { title: 'PhilHealth', children: [['EE', 'philhealth_ee'], ['ER', 'philhealth_er']] },
  { title: 'Pag-IBIG', children: [['EE', 'pagibig_ee'], ['Voluntary', 'pagibig_voluntary'], ['ER', 'pagibig_er']] },
];
export const AMOUNT_KEYS = CONTRIBUTION_AMOUNTS.flatMap((g) => g.children.map(([, k]) => k)).concat('tax');

export const amountColumns = (withTotals) => [
  ...CONTRIBUTION_AMOUNTS.map((g) => ({ title: g.title, children: g.children.map(([t, k]) => money(t, k, 105)) })),
  money('Tax', 'tax', 110),
  ...(withTotals ? [money('EE Total', 'ee_total', 120, { render: (v) => <strong>{peso(v)}</strong> }), money('ER Total', 'er_total', 120)] : []),
];

// The per-cut-off lines (an employee's `lines`).
export const lineColumns = [
  { title: 'Cut-off', dataIndex: 'cutoff', width: 130, fixed: 'left' },
  { title: 'Pay Date', dataIndex: 'pay_date', width: 105, render: (v) => (v ? formatDate(v) : '—') },
  money('SSS MSC', 'sss_msc', 110),
  ...amountColumns(false),
];

// A totals row of `rows` for columns laid out as `leading` cells then the
// amount keys (+ EE / ER totals when given).
export const totalsRow = (rows, leading, keys) => (
  <Table.Summary.Row>
    <Table.Summary.Cell index={0} colSpan={leading}><strong>Total</strong></Table.Summary.Cell>
    {keys.map((k, i) => (
      <Table.Summary.Cell key={k} index={leading + i} align='right'>{k ? <strong>{peso(sumOf(rows, k))}</strong> : null}</Table.Summary.Cell>
    ))}
  </Table.Summary.Row>
);
