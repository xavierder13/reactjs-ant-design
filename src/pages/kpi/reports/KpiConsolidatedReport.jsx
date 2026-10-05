import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  App, Breadcrumb, Button, Card, Checkbox, Col, DatePicker, Empty,
  Radio, Row, Select, Space, Spin, Table, Tag, Typography,
} from 'antd';
import { FileExcelOutlined, PrinterOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import kpiReportApi from '../../../services/kpi/kpiReportApi';
import handleApiError from '../../../utils/handleApiError';
import { downloadKpiConsolidatedReport } from '../../../utils/kpiConsolidatedReport';
import {
  SECTIONS, DEFAULT_SECTIONS, formatValue, filterRows,
  buildDetailed, buildSummary, summaryColumns,
} from './kpiReportLayout';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import './KpiConsolidatedReport.css';
import ExpandIcon from '../../../components/ExpandIcon';

const { RangePicker } = DatePicker;

const SECTION_CHOICES = [
  { label: 'Hide',      value: 'hide' },
  { label: 'Total',     value: 'total' },
  { label: 'Breakdown', value: 'breakdown' },
];

// Layout column → AntD Table column
const toTableColumns = (columns) => columns.map((col) => ({
  key:       col.key,
  title:     col.title,
  align:     col.numeric ? 'right' : 'left',
  width:     col.numeric ? 110 : undefined,
  render:    (_, record) => {
    const text = formatValue(col.value(record), col.format);
    return col.strong ? <Typography.Text strong>{text}</Typography.Text> : text;
  },
}));

// KPI Consolidated Report — final grades of approved evaluations for every
// position the user can see. Summary (per position) or Detailed (per
// employee), each section hidden / total / broken down, optionally grouped
// by branch (one printed page per branch). Screen, Print and Excel share the
// same layout (kpiReportLayout.js).
const KpiConsolidatedReport = () => {
  const { message } = App.useApp();

  const [period,  setPeriod]  = useState(null);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  const [positionIds,   setPositionIds]   = useState([]);
  const [branch,        setBranch]        = useState(null);
  const [mode,          setMode]          = useState('summary');
  const [sections,      setSections]      = useState(DEFAULT_SECTIONS);
  const [groupByBranch, setGroupByBranch] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data: res } = await kpiReportApi.getConsolidated({
        period_from: period?.[0]?.format('YYYY-MM-DD'),
        period_to:   period?.[1]?.format('YYYY-MM-DD'),
      });
      setData(res);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  // Filter choices come from the report itself (no other module's lookups)
  const positionOptions = useMemo(() => (data?.positions || [])
    .map((p) => ({ label: p.name, value: p.id })), [data]);
  const branchOptions = useMemo(() => [...new Set((data?.rows || []).map((r) => r.branch).filter(Boolean))]
    .sort()
    .map((b) => ({ label: b, value: b })), [data]);

  const rows = useMemo(() => filterRows(data?.rows || [], { positionIds, branch }), [data, positionIds, branch]);

  // One group, or one per branch
  const groups = useMemo(() => {
    if (!data) return [];
    const branches = groupByBranch
      ? [...new Set(rows.map((r) => r.branch || 'No branch'))].sort()
      : [null];

    return branches.map((b) => {
      const groupRows = b === null ? rows : rows.filter((r) => (r.branch || 'No branch') === b);
      return {
        branch:   b,
        summary:  buildSummary(data, groupRows),
        detailed: buildDetailed(data, groupRows, sections),
      };
    }).filter((g) => g.summary.length);
  }, [data, rows, sections, groupByBranch]);

  const summaryCols = useMemo(() => summaryColumns(data?.criteria || [], sections), [data, sections]);

  const periodLabel = period
    ? `${period[0].format('MM/DD/YYYY')} – ${period[1].format('MM/DD/YYYY')}`
    : 'All periods';
  const positionLabel = positionIds.length
    ? positionOptions.filter((o) => positionIds.includes(o.value)).map((o) => o.label).join(', ')
    : 'All positions';

  const exportExcel = () => downloadKpiConsolidatedReport({
    info: {
      period:      periodLabel,
      positions:   positionLabel,
      branch:      branch || 'All branches',
      generatedAt: dayjs().format('MM/DD/YYYY hh:mm A'),
      fileDate:    dayjs().format('YYYY-MM-DD'),
    },
    mode, sections, groups, summaryCols,
  });

  const setSection = (key, value) => setSections((prev) => ({ ...prev, [key]: value }));
  const showBreakdownList = sections.job === 'breakdown' || sections.demerit === 'breakdown';

  // defaultExpandAllRows only applies when a Table mounts — remount it when
  // a breakdown is switched on or the rows change, so the breakdown lists
  // open expanded (and print) instead of starting collapsed.
  const renderSummary = (group) => (
    <Table
      key={`${showBreakdownList}-${group.summary.map((s) => s.key).join('|')}`}
      rowKey='key'
      size='small'
      bordered
      pagination={false}
      scroll={{ x: 'max-content' }}
      columns={toTableColumns(summaryCols)}
      dataSource={group.summary}
      expandable={showBreakdownList ? {
        expandIcon: (props) => <ExpandIcon {...props} />,
        defaultExpandAllRows: true,
        expandedRowRender: (s) => (
          <Row gutter={24}>
            {sections.job === 'breakdown' && (
              <Col xs={24} md={12}>
                <Typography.Text strong>Job Performance — average grade</Typography.Text>
                {s.componentAverages.map((c) => (
                  <div key={c.code}>{c.code} – {c.name}: <b>{formatValue(c.grade, 'pct')}</b></div>
                ))}
              </Col>
            )}
            {sections.demerit === 'breakdown' && s.demeritAverages.length > 0 && (
              <Col xs={24} md={12}>
                <Typography.Text strong>Demerit — average deduction</Typography.Text>
                {s.demeritAverages.map((d) => (
                  <div key={d.code}>{d.code} – {d.name}: <b>{formatValue(d.deduction, 'pct')}</b></div>
                ))}
              </Col>
            )}
          </Row>
        ),
      } : undefined}
    />
  );

  const renderDetailed = (group) => group.detailed.map((g) => (
    <div key={g.position.id} className='kpi-report-position' style={{ marginBottom: 16 }}>
      <Typography.Text strong style={{ fontSize: 14 }}>
        {g.position.name} <Tag>{g.rows.length} evaluated</Tag>
      </Typography.Text>
      <Table
        rowKey='evaluation_id'
        size='small'
        bordered
        pagination={false}
        scroll={{ x: 'max-content' }}
        style={{ marginTop: 6 }}
        columns={toTableColumns(g.columns)}
        dataSource={g.rows}
        summary={() => (
          <Table.Summary.Row>
            {g.columns.map((col, i) => (
              <Table.Summary.Cell key={col.key} index={i} align={col.numeric ? 'right' : 'left'}>
                {i === 0
                  ? <Typography.Text strong>Average</Typography.Text>
                  : <Typography.Text strong>{col.numeric ? formatValue(g.average[col.key], col.format) : ''}</Typography.Text>}
              </Table.Summary.Cell>
            ))}
          </Table.Summary.Row>
        )}
      />
    </div>
  ));

  return (
    <div className='kpi-report'>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to='/'>Home</Link> },
          { title: 'KPI Management' },
          { title: 'Consolidated Report' },
        ]}
      />

      {/* ── Options (not printed) ─────────────────────────────────────── */}
      <Card className='no-print' style={{ borderRadius: 12, marginBottom: 16 }}>
        <Typography.Title level={4} style={{ marginTop: 0 }}>KPI Consolidated Report</Typography.Title>
        <Typography.Paragraph type='secondary' style={{ marginTop: -8 }}>
          Final grades of approved evaluations, for every position you can see.
        </Typography.Paragraph>

        <Row gutter={[16, 12]} align='bottom'>
          <Col xs={24} md={8}>
            <Typography.Text type='secondary'>Evaluation period</Typography.Text>
            <RangePicker style={{ width: '100%' }} value={period} onChange={setPeriod} format={DISPLAY_DATE_FORMAT} />
          </Col>
          <Col xs={24} md={4}>
            <Button type='primary' icon={<SearchOutlined />} loading={loading} onClick={generate} block>
              Generate
            </Button>
          </Col>
        </Row>

        {data && (
          <>
            <Row gutter={[16, 12]} style={{ marginTop: 16 }}>
              <Col xs={24} md={10}>
                <Typography.Text type='secondary'>Positions</Typography.Text>
                <Select
                  mode='multiple' allowClear showSearch optionFilterProp='label'
                  placeholder='All positions' style={{ width: '100%' }}
                  options={positionOptions} value={positionIds} onChange={setPositionIds}
                />
              </Col>
              <Col xs={24} md={6}>
                <Typography.Text type='secondary'>Branch</Typography.Text>
                <Select
                  allowClear showSearch optionFilterProp='label'
                  placeholder='All branches' style={{ width: '100%' }}
                  options={branchOptions} value={branch} onChange={(v) => setBranch(v ?? null)}
                />
              </Col>
              <Col xs={24} md={8}>
                <Typography.Text type='secondary'>Layout</Typography.Text>
                <div>
                  <Radio.Group
                    optionType='button' buttonStyle='solid' value={mode} onChange={(e) => setMode(e.target.value)}
                    options={[{ label: 'Summary', value: 'summary' }, { label: 'Detailed', value: 'detailed' }]}
                  />
                </div>
              </Col>
            </Row>

            <Row gutter={[16, 12]} style={{ marginTop: 12 }}>
              {SECTIONS.map((s) => (
                <Col xs={24} md={7} key={s.key}>
                  <Typography.Text type='secondary'>{s.label}</Typography.Text>
                  <div>
                    <Radio.Group
                      size='small' optionType='button' value={sections[s.key]}
                      onChange={(e) => setSection(s.key, e.target.value)} options={SECTION_CHOICES}
                    />
                  </div>
                </Col>
              ))}
              <Col xs={24} md={3} style={{ display: 'flex', alignItems: 'flex-end' }}>
                <Checkbox checked={groupByBranch} onChange={(e) => setGroupByBranch(e.target.checked)}>
                  Group by branch
                </Checkbox>
              </Col>
            </Row>

            <Row justify='end' style={{ marginTop: 16 }}>
              <Space>
                <Button icon={<PrinterOutlined />} onClick={() => window.print()} disabled={!groups.length}>
                  Print
                </Button>
                <Button icon={<FileExcelOutlined />} onClick={exportExcel} disabled={!groups.length}>
                  Export to Excel
                </Button>
              </Space>
            </Row>
          </>
        )}
      </Card>

      {/* ── Report ────────────────────────────────────────────────────── */}
      {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin size='large' /></div>}

      {!loading && data && !groups.length && (
        <Card style={{ borderRadius: 12 }}><Empty description='No approved evaluations match these filters.' /></Card>
      )}

      {!loading && groups.map((group) => (
        <Card key={group.branch ?? 'all'} className='kpi-report-branch' style={{ borderRadius: 12, marginBottom: 16 }}>
          <div className='kpi-report-print-header'>
            <Typography.Title level={5} style={{ margin: 0 }}>KPI Consolidated Report — approved evaluations</Typography.Title>
            <Typography.Text type='secondary'>
              {periodLabel} · {positionLabel} · {group.branch ? `Branch: ${group.branch}` : (branch ? `Branch: ${branch}` : 'All branches')}
            </Typography.Text>
          </div>
          {group.branch && (
            <Typography.Title level={5} className='no-print' style={{ marginTop: 0 }}>{group.branch}</Typography.Title>
          )}
          {mode === 'summary' ? renderSummary(group) : renderDetailed(group)}
        </Card>
      ))}
    </div>
  );
};

export default KpiConsolidatedReport;
