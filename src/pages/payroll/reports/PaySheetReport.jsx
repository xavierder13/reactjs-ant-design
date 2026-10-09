import { useEffect, useState } from 'react';
import { Button, Space, Table, Tabs, Alert, Typography, Popconfirm, App } from 'antd';
import { DownloadOutlined, PrinterOutlined, SearchOutlined } from '@ant-design/icons';
import payrollReportApi from '../../../services/payroll/payrollReportApi';
import handleApiError from '../../../utils/handleApiError';
import downloadBlobResponse from '../../../utils/downloadBlobResponse';
import printDocument from '../../../utils/printDocument';
import { tablePagination } from '../../../utils/tablePagination';
import { rateLabel } from '../../compensation/compensationHelpers';
import { peso } from '../payrollHelpers';
import { money, sumOf, nameOf } from './reportHelpers';
import { payslipHtml } from './printTemplates';
import RangeFilters from './RangeFilters';
import { defaultRangeFilters, rangeParams, useRangeCutoffs } from './rangeHelpers';

// The money columns of a pay sheet line (PayrollReportService::PAY_KEYS),
// labelled as the payroll register / Excel.
const PAY_GROUPS = [
  { title: 'Earnings', children: [
    ['Basic Pay', 'basic'], ['Absences / Late / UT', 'deductions_from_basic'], ['Paid Leave', 'paid_leave'], ['Holiday Pay', 'holiday_pay'],
    ['Overtime', 'overtime'], ['Night Diff.', 'night_diff'], ['Allowances (taxable)', 'allowances_taxable'],
    ['Allowances (non-taxable)', 'allowances_non_taxable'], ['Adjustments', 'adjustments'], ['Gross Pay', 'gross', true],
  ] },
  { title: 'Deductions', children: [
    ['SSS', 'sss_ee'], ['PhilHealth', 'philhealth_ee'], ['Pag-IBIG', 'pagibig_ee'], ['Pag-IBIG (vol.)', 'pagibig_voluntary'],
    ['Withholding Tax', 'tax'], ['Loans & Deductions', 'loans'], ['Other Deductions', 'other_deductions'], ['Total Deductions', 'total_deductions', true],
  ] },
  { title: 'Net Pay', key: 'net' },
  { title: 'Employer Share', children: [['SSS ER', 'sss_er'], ['SSS EC', 'sss_ec'], ['PhilHealth ER', 'philhealth_er'], ['Pag-IBIG ER', 'pagibig_er'], ['Total', 'employer_share', true]] },
];
const strong = (v) => <strong>{peso(v)}</strong>;
const moneyColumns = PAY_GROUPS.map((g) => (g.key
  ? money(g.title, g.key, 130, { render: strong })
  : { title: g.title, children: g.children.map(([t, k, bold]) => money(t, k, 120, bold ? { render: strong } : {})) }));
const PAY_KEYS = PAY_GROUPS.flatMap((g) => (g.key ? [g.key] : g.children.map(([, k]) => k)));

const GROUPS = [
  { key: 'by_company', label: 'By Company', title: 'Company' },
  { key: 'by_branch', label: 'By Branch', title: 'Branch' },
  { key: 'by_position', label: 'By Position', title: 'Position' },
  { key: 'by_cutoff', label: 'By Cut-off', title: 'Cut-off' },
];

const totalRow = (rows, leading) => (
  <Table.Summary.Row>
    <Table.Summary.Cell index={0} colSpan={leading}><strong>Total</strong></Table.Summary.Cell>
    {PAY_KEYS.map((k, i) => <Table.Summary.Cell key={k} index={leading + i} align='right'><strong>{peso(sumOf(rows, k))}</strong></Table.Summary.Cell>)}
  </Table.Summary.Row>
);

// Pay sheet (/pay-sheet — payroll-report-view): the APPROVED payrolls whose
// cut-off ends in a date or cut-off range (≤ 1 year), one line per employee
// (summed over the cut-offs), with subtotals by company, branch, position
// (the employee's current ones) and cut-off. Download = Excel (a sheet per
// tab). Print Payslips = every approved payslip of the range and filters
// (≤ 500), one per page.
const PaySheetReport = () => {
  const { message } = App.useApp();
  const cutoffs = useRangeCutoffs();
  const [filters, setFilters] = useState(defaultRangeFilters);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);

  const paramsOrWarn = () => {
    const params = rangeParams(filters, cutoffs);
    if (!params) message.error('Choose the dates or the cut-offs');
    return params;
  };

  const fetchReport = async (f = filters) => {
    const params = rangeParams(f, cutoffs);
    if (!params) { message.error('Choose the dates or the cut-offs'); return; }
    setLoading(true);
    try {
      const { data: res } = await payrollReportApi.paySheet(params);
      setData(res);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchReport(defaultRangeFilters()); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = async () => {
    const params = paramsOrWarn();
    if (!params) return;
    setBusy('download');
    try {
      const response = await payrollReportApi.paySheetDownload(params);
      if (await downloadBlobResponse(response, `PaySheet_${params.date_from}_${params.date_to}.xls`, message)) message.success('Pay sheet downloaded.');
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setBusy(null);
    }
  };

  const printPayslips = async () => {
    const params = paramsOrWarn();
    if (!params) return;
    setBusy('print');
    try {
      const { data: res } = await payrollReportApi.payslips(params);
      if (!res.payslips.length) { message.info('No approved payslip in this range.'); return; }
      const body = res.payslips
        .map((p, i) => `<div${i < res.payslips.length - 1 ? ' style="page-break-after:always"' : ''}>${payslipHtml(p.payslip, p.run, res.employer)}</div>`)
        .join('');
      if (!printDocument(`Payslips ${params.date_from} – ${params.date_to}`, body)) message.error('Allow pop-ups to print the payslips');
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setBusy(null);
    }
  };

  const employees = data?.employees || [];
  const employeeColumns = [
    {
      title: 'Employee',
      key: 'employee',
      fixed: 'left',
      width: 230,
      render: (_, r) => (
        <div>
          <div>{nameOf(r)}</div>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>{`${r.employee_code} · ${r.branch || '—'}`}</Typography.Text>
        </div>
      ),
    },
    { title: 'Position', dataIndex: 'position', width: 160, render: (v) => v || '—' },
    { title: 'Rate', key: 'rate', width: 140, render: (_, r) => rateLabel(r.pay_basis, r.basic_rate) },
    { title: 'Cut-offs', dataIndex: 'cutoffs', width: 80, align: 'right' },
    ...moneyColumns,
  ];
  const groupColumns = (title) => [
    { title, dataIndex: 'group', fixed: 'left', width: 200 },
    { title: 'Employees', dataIndex: 'employees', width: 95, align: 'right' },
    ...moneyColumns,
  ];
  const tableProps = { size: 'small', bordered: true, loading, scroll: { x: 3500 } };

  const tabs = [
    {
      key: 'employees',
      label: `By Employee (${employees.length})`,
      children: (
        <Table
          {...tableProps}
          rowKey='employee_id'
          columns={employeeColumns}
          dataSource={employees}
          pagination={tablePagination(20)}
          summary={() => employees.length > 0 && totalRow(employees, 4)}
        />
      ),
    },
    ...GROUPS.map((g) => {
      const rows = data?.[g.key] || [];
      return {
        key: g.key,
        label: `${g.label} (${rows.length})`,
        children: (
          <Table
            {...tableProps}
            rowKey='group'
            columns={groupColumns(g.title)}
            dataSource={rows}
            pagination={false}
            summary={() => rows.length > 0 && totalRow(rows, 2)}
          />
        ),
      };
    }),
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <RangeFilters value={filters} onChange={setFilters} cutoffs={cutoffs} />
        <Space wrap>
          <Button type='primary' icon={<SearchOutlined />} onClick={() => fetchReport()} loading={loading}>View</Button>
          <Button color='purple' variant='outlined' icon={<DownloadOutlined />} loading={busy === 'download'} disabled={!employees.length} onClick={download}>Download (Excel)</Button>
          <Popconfirm
            title='Print the payslips?'
            description={<div style={{ maxWidth: 300 }}>Every approved payslip of the chosen range and filters (at most 500), one per page.</div>}
            okText='Print'
            onConfirm={printPayslips}
          >
            <Button color='purple' variant='outlined' icon={<PrinterOutlined />} loading={busy === 'print'}>Print Payslips</Button>
          </Popconfirm>
        </Space>
      </Space>
      {data && (
        <>
          <Alert
            type={data.cutoffs.length ? 'info' : 'warning'}
            showIcon
            style={{ marginBottom: 12 }}
            title={data.cutoffs.length
              ? `From ${data.cutoffs.length} approved payroll(s): ${data.cutoffs.map((c) => c.code).join(', ')} — net pay ${peso(data.totals.net)} for ${data.totals.employees} employee(s).`
              : 'No approved payroll ends in this range.'}
            description='Subtotals use each employee’s current company / branch / position.'
          />
          <Tabs items={tabs} />
        </>
      )}
    </div>
  );
};

export default PaySheetReport;
