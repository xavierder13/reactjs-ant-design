import { useEffect, useState } from 'react';
import { Button, Space, Table, Card, Row, Col, Statistic, Alert, Typography, App } from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import payrollReportApi from '../../../services/payroll/payrollReportApi';
import handleApiError from '../../../utils/handleApiError';
import downloadBlobResponse from '../../../utils/downloadBlobResponse';
import { tablePagination } from '../../../utils/tablePagination';
import ExpandIcon from '../../../components/ExpandIcon';
import { peso } from '../payrollHelpers';
import { nameOf } from './reportHelpers';
import RangeFilters from './RangeFilters';
import { defaultRangeFilters, rangeParams, useRangeCutoffs } from './rangeHelpers';
import { AMOUNT_KEYS, amountColumns, lineColumns, totalsRow } from './contributionHistoryColumns';

// Contribution history (/contribution-history — payroll-report-view): SSS,
// PhilHealth, Pag-IBIG (EE / ER / EC) and withholding tax actually deducted,
// per employee, from the APPROVED payrolls whose cut-off ends in a date or
// cut-off range (≤ 1 year); each employee expands into its cut-offs.
// Download = Excel (By Employee, By Cut-off, Summary).
const ContributionHistoryReport = () => {
  const { message } = App.useApp();
  const cutoffs = useRangeCutoffs();
  const [filters, setFilters] = useState(defaultRangeFilters);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchReport = async (f = filters) => {
    const params = rangeParams(f, cutoffs);
    if (!params) { message.error('Choose the dates or the cut-offs'); return; }
    setLoading(true);
    try {
      const { data: res } = await payrollReportApi.contributionHistory(params);
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
    const params = rangeParams(filters, cutoffs);
    if (!params) { message.error('Choose the dates or the cut-offs'); return; }
    setDownloading(true);
    try {
      const response = await payrollReportApi.contributionHistoryDownload(params);
      if (await downloadBlobResponse(response, `Contributions_${params.date_from}_${params.date_to}.xls`, message)) message.success('Contribution history downloaded.');
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setDownloading(false);
    }
  };

  const employees = data?.employees || [];
  const t = data?.totals;
  const columns = [
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
    { title: 'Cut-offs', key: 'count', width: 80, align: 'right', render: (_, r) => r.lines.length },
    ...amountColumns(true),
  ];

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
        <RangeFilters value={filters} onChange={setFilters} cutoffs={cutoffs} />
        <Space wrap>
          <Button type='primary' icon={<SearchOutlined />} onClick={() => fetchReport()} loading={loading}>View</Button>
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
              ? `From ${data.cutoffs.length} approved payroll(s): ${data.cutoffs.map((c) => c.code).join(', ')}`
              : 'No approved payroll ends in this range.'}
            description='Grouped by each employee’s current branch / position.'
          />
          <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
            {stat('SSS', t.sss_total, `EE ${peso(t.sss_ee)} · ER ${peso(t.sss_er)} · EC ${peso(t.sss_ec)}`)}
            {stat('PhilHealth', t.philhealth_total, `EE ${peso(t.philhealth_ee)} · ER ${peso(t.philhealth_er)}`)}
            {stat('Pag-IBIG', t.pagibig_total, `EE ${peso(t.pagibig_ee)} · vol. ${peso(t.pagibig_voluntary)} · ER ${peso(t.pagibig_er)}`)}
            {stat('Withholding Tax', t.tax, `EE share ${peso(t.ee_total)} · ER share ${peso(t.er_total)}`)}
          </Row>
          <Table
            rowKey='employee_id'
            size='small'
            bordered
            columns={columns}
            dataSource={employees}
            loading={loading}
            pagination={tablePagination(20)}
            scroll={{ x: 1650 }}
            expandable={{
              expandIcon: (props) => <ExpandIcon {...props} />,
              expandedRowRender: (r) => (
                <Table rowKey='cutoff' size='small' columns={lineColumns} dataSource={r.lines} pagination={false} scroll={{ x: 1250 }} />
              ),
            }}
            summary={() => employees.length > 0 && totalsRow(employees, 3, [...AMOUNT_KEYS, 'ee_total', 'er_total'])}
          />
        </>
      )}
    </div>
  );
};

export default ContributionHistoryReport;
