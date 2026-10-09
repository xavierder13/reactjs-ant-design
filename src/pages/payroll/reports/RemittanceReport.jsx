import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { DatePicker, Button, Space, Table, Tabs, Card, Row, Col, Statistic, Alert, Typography, App } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import payrollReportApi from '../../../services/payroll/payrollReportApi';
import handleApiError from '../../../utils/handleApiError';
import downloadBlobResponse from '../../../utils/downloadBlobResponse';
import { tablePagination } from '../../../utils/tablePagination';
import { cutoffLabel, peso } from '../payrollHelpers';
import { money, sumOf, nameOf } from './reportHelpers';

const missing = (v) => v || <Typography.Text type='danger'>Missing</Typography.Text>;
const empColumn = { title: 'Employee', key: 'employee', fixed: 'left', width: 230, render: (_, r) => (
  <div>
    <div>{nameOf(r)}</div>
    <Typography.Text type='secondary' style={{ fontSize: 12 }}>{`${r.employee_code} · ${r.branch || '—'}`}</Typography.Text>
  </div>
) };

// Each agency's tab: its own number column, the amounts, and a total row.
const AGENCIES = [
  {
    key: 'sss', label: 'SSS', number: 'sss_no', numberLabel: 'SSS No.',
    amounts: [['Salary Credit', 'sss_msc', false], ['EE', 'sss_ee'], ['ER', 'sss_er'], ['EC', 'sss_ec']],
    total: (r) => Number(r.sss_ee) + Number(r.sss_er) + Number(r.sss_ec),
    has: (r) => Number(r.sss_ee) || Number(r.sss_er),
  },
  {
    key: 'philhealth', label: 'PhilHealth', number: 'philhealth_no', numberLabel: 'PhilHealth No.',
    amounts: [['Basic Salary', 'philhealth_base', false], ['EE', 'philhealth_ee'], ['ER', 'philhealth_er']],
    total: (r) => Number(r.philhealth_ee) + Number(r.philhealth_er),
    has: (r) => Number(r.philhealth_ee) || Number(r.philhealth_er),
  },
  {
    key: 'pagibig', label: 'Pag-IBIG', number: 'pagibig_no', numberLabel: 'Pag-IBIG MID No.',
    amounts: [['Compensation', 'pagibig_base', false], ['EE', 'pagibig_ee'], ['Voluntary EE', 'pagibig_voluntary'], ['ER', 'pagibig_er']],
    total: (r) => Number(r.pagibig_ee) + Number(r.pagibig_voluntary) + Number(r.pagibig_er),
    has: (r) => Number(r.pagibig_ee) || Number(r.pagibig_er) || Number(r.pagibig_voluntary),
  },
  {
    key: 'bir', label: 'BIR 1601-C', number: 'tin_no', numberLabel: 'TIN',
    amounts: [['Compensation', 'gross'], ['Non-taxable', 'non_taxable'], ['Taxable', 'taxable'], ['Tax Withheld', 'tax']],
    has: () => true,
  },
];

// Monthly remittances (/remittances — payroll-report-view): SSS, PhilHealth
// and Pag-IBIG contributions (employee + employer share) and the BIR 1601-C
// withholding, per employee, from the month's APPROVED payrolls. Download =
// one Excel workbook (Summary + a sheet per agency) to fill the agencies'
// own upload / return forms.
const RemittanceReport = () => {
  const { message } = App.useApp();
  const [month, setMonth] = useState(dayjs().subtract(1, 'month').startOf('month'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const params = { year: month.year(), month: month.month() + 1 };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data: res } = await payrollReportApi.remittance(params);
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
  }, [month]);

  const download = async () => {
    setDownloading(true);
    try {
      const response = await payrollReportApi.remittanceDownload(params);
      if (await downloadBlobResponse(response, `Remittances_${month.format('YYYY-MM')}.xls`, message)) message.success('Remittance report downloaded.');
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setDownloading(false);
    }
  };

  const t = data?.totals;
  const employees = data?.employees || [];

  const agencyTab = (a) => {
    const rows = employees.filter(a.has);
    const amountCols = a.amounts.map(([title, key, isSum = true]) => ({ ...money(title, key, 120), isSum }));
    const columns = [
      empColumn,
      { title: a.numberLabel, dataIndex: a.number, width: 150, render: missing },
      ...amountCols,
      ...(a.total ? [{ title: 'Total', key: 'total', width: 130, align: 'right', render: (_, r) => <strong>{peso(a.total(r))}</strong> }] : []),
    ];
    return {
      key: a.key,
      label: `${a.label} (${rows.length})`,
      children: (
        <Table
          rowKey='employee_id'
          size='small'
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={tablePagination(20)}
          scroll={{ x: 900 }}
          summary={() => rows.length > 0 && (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}><strong>Total</strong></Table.Summary.Cell>
              {amountCols.map((c, i) => (
                <Table.Summary.Cell key={c.dataIndex} index={i + 2} align='right'>{c.isSum ? <strong>{peso(sumOf(rows, c.dataIndex))}</strong> : null}</Table.Summary.Cell>
              ))}
              {a.total && <Table.Summary.Cell index={amountCols.length + 2} align='right'><strong>{peso(rows.reduce((s, r) => s + a.total(r), 0))}</strong></Table.Summary.Cell>}
            </Table.Summary.Row>
          )}
        />
      ),
    };
  };

  const stat = (title, value, sub) => (
    <Col xs={12} md={6}>
      <Card size='small'>
        <Statistic title={title} value={value} precision={2} prefix='₱' />
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>{sub}</Typography.Text>
      </Card>
    </Col>
  );

  return (
    <div>
      <Space wrap style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <DatePicker picker='month' value={month} onChange={(v) => v && setMonth(v.startOf('month'))} allowClear={false} format='MMMM YYYY' />
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchReport} loading={loading}>Refresh</Button>
          <Button color='purple' variant='outlined' icon={<DownloadOutlined />} loading={downloading} disabled={!employees.length} onClick={download}>Download (Excel)</Button>
        </Space>
      </Space>
      {data && (
        <>
          <Alert
            type={data.cutoffs.length ? 'info' : 'warning'}
            showIcon
            style={{ marginBottom: 12 }}
            title={data.cutoffs.length
              ? `From the approved payroll(s) of ${month.format('MMMM YYYY')}: ${data.cutoffs.map(cutoffLabel).join(', ')}`
              : `No approved payroll in ${month.format('MMMM YYYY')} yet.`}
          />
          <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
            {stat('SSS', t.sss.total, `EE ${peso(t.sss.ee)} · ER ${peso(t.sss.er)} · EC ${peso(t.sss.ec)}`)}
            {stat('PhilHealth', t.philhealth.total, `EE ${peso(t.philhealth.ee)} · ER ${peso(t.philhealth.er)}`)}
            {stat('Pag-IBIG', t.pagibig.total, `EE ${peso(t.pagibig.ee)} · ER ${peso(t.pagibig.er)}`)}
            {stat('Withholding Tax (1601-C)', t.bir.tax, `taxable ${peso(t.bir.taxable)}`)}
          </Row>
          {!data.employer?.name && (
            <Alert type='warning' showIcon style={{ marginBottom: 12 }} title='The employer name / numbers are not set — Payroll → Setup → Payroll Settings → Employer.' />
          )}
          <Tabs items={AGENCIES.map(agencyTab)} />
        </>
      )}
    </div>
  );
};

export default RemittanceReport;
