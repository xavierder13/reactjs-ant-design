import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Select, Button, Space, Table, Tag, Tooltip, Alert, Input, Typography, App } from 'antd';
import { DownloadOutlined, ReloadOutlined, PrinterOutlined } from '@ant-design/icons';
import payrollReportApi from '../../../services/payroll/payrollReportApi';
import handleApiError from '../../../utils/handleApiError';
import downloadBlobResponse from '../../../utils/downloadBlobResponse';
import printDocument from '../../../utils/printDocument';
import { tablePagination } from '../../../utils/tablePagination';
import { peso } from '../payrollHelpers';
import { certificate2316Html } from './printTemplates';
import { money, sumOf, nameOf } from './reportHelpers';

const YEARS = Array.from({ length: 4 }, (_, i) => dayjs().year() - i);

// Year-end tax (/year-end-tax — payroll-report-view): the annualized
// withholding tax per employee from the year's approved payrolls and the
// approved 13th month (₱90,000 benefits exemption, mandatory contributions
// deducted, minimum wage earners exempt): tax due on the year's taxable
// compensation vs. withheld → still to withhold (+) on the last payroll or
// to refund (−). Alphalist (Excel, BIR 1604-C schedule data) and a
// printable BIR 2316 per employee.
const YearEndTaxReport = () => {
  const { message } = App.useApp();
  const [year, setYear] = useState(dayjs().year());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [search, setSearch] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data: res } = await payrollReportApi.annualization({ year });
      setData(res);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchReport(); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const downloadAlphalist = async () => {
    setBusy('alphalist');
    try {
      const response = await payrollReportApi.alphalistDownload({ year });
      if (await downloadBlobResponse(response, `Alphalist_${year}.xls`, message)) message.success('Alphalist downloaded.');
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setBusy(null);
    }
  };

  const print2316 = async (r) => {
    setBusy(r.employee_id);
    try {
      const { data: res } = await payrollReportApi.certificate({ year, employee_id: r.employee_id });
      if (!printDocument(`BIR 2316 ${year} ${nameOf(r)}`, certificate2316Html(res))) message.error('Allow pop-ups to print the certificate');
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setBusy(null);
    }
  };

  const rows = (data?.employees || []).filter((r) => !search || `${r.employee_code} ${nameOf(r)}`.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      fixed: 'left',
      width: 230,
      render: (_, r) => (
        <div>
          <div>{nameOf(r)}</div>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>{`${r.employee_code} · TIN ${r.tin_no || '—'}`}</Typography.Text>
        </div>
      ),
    },
    money('Gross Compensation', 'gross_compensation', 150),
    money('13th Month', 'thirteenth_month', 120),
    money('Contributions', 'mandatory_contributions', 120),
    money('Non-taxable', 'non_taxable', 130),
    money('Taxable', 'taxable', 130),
    money('Tax Due', 'tax_due', 120),
    money('Withheld', 'tax_withheld', 120),
    {
      title: 'Difference',
      dataIndex: 'difference',
      width: 150,
      align: 'right',
      render: (v, r) => (
        <div>
          <Typography.Text strong type={v < 0 ? 'success' : v > 0 ? 'danger' : undefined}>{peso(Math.abs(v))}</Typography.Text>
          <div>
            {r.minimum_wage_earner
              ? <Tag>MWE</Tag>
              : <Typography.Text type='secondary' style={{ fontSize: 12 }}>{v > 0 ? 'to withhold' : v < 0 ? 'to refund' : 'settled'}</Typography.Text>}
          </div>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, r) => (
        <Tooltip title='Print BIR 2316'>
          <Button color='purple' variant='outlined' size='small' icon={<PrinterOutlined />} loading={busy === r.employee_id} onClick={() => print2316(r)} />
        </Tooltip>
      ),
    },
  ];

  const sumCell = (index, key) => <Table.Summary.Cell index={index} align='right'><strong>{peso(sumOf(rows, key))}</strong></Table.Summary.Cell>;

  return (
    <div>
      <Space wrap style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Select value={year} onChange={setYear} options={YEARS.map((y) => ({ value: y, label: y }))} style={{ width: 110 }} />
          <Input.Search allowClear placeholder='Code or name' onSearch={(v) => setSearch(v.trim())} onChange={(e) => !e.target.value && setSearch('')} style={{ width: 220 }} />
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchReport} loading={loading}>Refresh</Button>
          <Button color='purple' variant='outlined' icon={<DownloadOutlined />} loading={busy === 'alphalist'} disabled={!data?.employees?.length} onClick={downloadAlphalist}>Alphalist (Excel)</Button>
        </Space>
      </Space>
      <Alert
        type='info'
        showIcon
        style={{ marginBottom: 12 }}
        title={`From the approved payrolls and 13th-month pay of ${year}. Difference: still to withhold (red) — deduct on the last payroll of the year; to refund (green) — return to the employee.`}
      />
      {data && !data.employer?.tin && (
        <Alert type='warning' showIcon style={{ marginBottom: 12 }} title='The employer TIN is not set — Payroll → Setup → Payroll Settings → Employer.' />
      )}
      <Table
        rowKey='employee_id'
        size='small'
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={tablePagination(20)}
        scroll={{ x: 1450 }}
        locale={{ emptyText: `No approved payroll in ${year}` }}
        summary={() => rows.length > 1 && (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}><strong>Total</strong></Table.Summary.Cell>
            {sumCell(1, 'gross_compensation')}
            {sumCell(2, 'thirteenth_month')}
            {sumCell(3, 'mandatory_contributions')}
            {sumCell(4, 'non_taxable')}
            {sumCell(5, 'taxable')}
            {sumCell(6, 'tax_due')}
            {sumCell(7, 'tax_withheld')}
            {sumCell(8, 'difference')}
            <Table.Summary.Cell index={9} />
          </Table.Summary.Row>
        )}
      />
    </div>
  );
};

export default YearEndTaxReport;
