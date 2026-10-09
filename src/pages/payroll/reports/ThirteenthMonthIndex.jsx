import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Table, Tag, Button, Space, Tooltip, Modal, Form, Input, InputNumber, DatePicker, Descriptions, Alert, Typography, Popconfirm, Spin, Row, Col, App,
} from 'antd';
import {
  EyeOutlined, PlusOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, FileExcelOutlined, BankOutlined, SendOutlined, StopOutlined,
} from '@ant-design/icons';
import useAuth from '../../../hooks/useAuth';
import thirteenthMonthApi from '../../../services/payroll/thirteenthMonthApi';
import handleApiError from '../../../utils/handleApiError';
import downloadBlobResponse from '../../../utils/downloadBlobResponse';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../../utils/formatDate';
import { tablePagination } from '../../../utils/tablePagination';
import { peso } from '../payrollHelpers';
import ReasonModal from '../ReasonModal';
import ExpandIcon from '../../../components/ExpandIcon';
import ApprovalSteps from '../../../components/approval/ApprovalSteps';
import FilingHistory from '../../../components/approval/FilingHistory';
import BankFileModal from '../run/BankFileModal';
import { RUN_STATUS_COLORS } from '../run/runHelpers';
import { money, sumOf } from './reportHelpers';

const when = (v) => (v ? dayjs(v).format(`${DISPLAY_DATE_FORMAT} hh:mm A`) : '—');

// 13th-month pay (/thirteenth-month — thirteenth-month-list / -generate /
// -approve / -cancel): one batch per year (PD 851: the year's basic salary ÷
// 12). Generate makes / re-makes the Draft from the year's approved payrolls
// (basic pay + paid leave − absences / late / undertime + salary
// differentials), the rest of the year projected at the monthly rate in
// force. Submit sends it to the "13th Month Pay" Access Chart (the payroll
// run's approval: levels, required approvals, approvers; the submitter can't
// decide their own — Administrator bypasses); the last approval releases it
// (Approved), a disapproval (remarks) returns it to Draft. Excel register
// and bank file. Over ₱90,000 (with other benefits) is taxable — counted in
// the year-end tax.
const ThirteenthMonthIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole, user } = useAuth();
  const isAdmin = hasRole('Administrator');
  const canGenerate = isAdmin || hasPermission('thirteenth-month-generate');
  const canApprove = isAdmin || hasPermission('thirteenth-month-approve');
  const canCancel = isAdmin || hasPermission('thirteenth-month-cancel');

  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [view, setView] = useState(null);
  const [busy, setBusy] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [bank, setBank] = useState(null);
  const [search, setSearch] = useState('');
  const [remarks, setRemarks] = useState('');
  const [form] = Form.useForm();

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const { data } = await thirteenthMonthApi.getAll();
      setRuns(data.runs);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchRuns(); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadView = async (id) => {
    try {
      const { data } = await thirteenthMonthApi.show(id);
      setView(data);
    } catch (error) {
      handleApiError(error, message);
      setViewId(null);
    }
  };

  const openGenerate = () => {
    form.resetFields();
    const year = dayjs().year();
    form.setFieldsValue({ year, pay_date: dayjs(`${year}-12-15`) });
    setGenOpen(true);
  };

  const generate = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }
    setGenerating(true);
    try {
      const { data } = await thirteenthMonthApi.generate({
        year: values.year,
        pay_date: values.pay_date ? values.pay_date.format('YYYY-MM-DD') : null,
        remarks: values.remarks?.trim() || null,
      });
      message.success(data.message);
      setGenOpen(false);
      await fetchRuns();
      setView(null);
      setViewId(data.run.id);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setGenerating(false);
    }
  };

  const act = async (kind, fn) => {
    setBusy(kind);
    try {
      const { data } = await fn();
      message.success(data.message);
      setRemarks('');
      await Promise.all([fetchRuns(), loadView(viewId)]);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setBusy(null);
    }
  };

  const download = async (run) => {
    setBusy('download');
    try {
      const response = await thirteenthMonthApi.download(run.id);
      if (await downloadBlobResponse(response, `13th_Month_${run.year}.xls`, message)) message.success('13th-month register downloaded.');
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setBusy(null);
    }
  };

  const columns = [
    { title: 'Year', dataIndex: 'year', width: 80 },
    { title: 'Status', dataIndex: 'status', width: 100, render: (v) => <Tag color={RUN_STATUS_COLORS[v]}>{v}</Tag> },
    { title: 'Earned Through', dataIndex: 'earned_through', width: 130, render: (v) => formatDate(v, '—') },
    { title: 'Pay Date', dataIndex: 'pay_date', width: 110, render: (v) => formatDate(v, '—') },
    { title: 'Employees', dataIndex: 'employee_count', width: 100, align: 'right' },
    { title: 'Total', dataIndex: 'total_amount', width: 140, align: 'right', render: (v) => <strong>{peso(v)}</strong> },
    {
      title: 'Generated',
      key: 'generated',
      width: 190,
      render: (_, r) => (
        <div>
          <div>{r.generator?.name || '—'}</div>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>{when(r.generated_at)}</Typography.Text>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, r) => (
        <Tooltip title='View 13th-month pay'>
          <Button color='blue' variant='outlined' size='small' icon={<EyeOutlined />} onClick={() => { setView(null); setViewId(r.id); }} />
        </Tooltip>
      ),
    },
  ];

  const run = view?.run;
  const pays = (view?.pays || []).filter((p) => !search || `${p.employee_code} ${p.full_name}`.toLowerCase().includes(search.toLowerCase()));
  const isDraft = run?.status === 'Draft';
  const approval = view?.approval;
  const canDecide = run?.status === 'Pending' && !!approval?.can_approve;
  const ownSubmission = run?.status === 'Pending' && run.submitted_by === user?.id && !isAdmin;
  const levelInfo = approval?.levels?.find((l) => l.level === run?.current_level);
  // the approval that releases it: the last level's last required approval
  const lastApproval = !approval?.levels?.length
    || (levelInfo && levelInfo.level === approval.levels[approval.levels.length - 1].level && levelInfo.approved + 1 >= levelInfo.required);
  const returned = isDraft && run?.acted_at && run?.action_remarks;
  const withWarnings = (view?.pays || []).filter((p) => p.warnings?.length).length;

  const payColumns = [
    {
      title: 'Employee',
      key: 'employee',
      fixed: 'left',
      width: 230,
      render: (_, r) => (
        <div>
          <div>{r.full_name}</div>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>{`${r.employee_code} · ${r.branch || '—'}`}</Typography.Text>
        </div>
      ),
    },
    { title: 'Pay Basis', dataIndex: 'pay_basis', width: 90 },
    money('Basic Earned', 'basic_earned', 130),
    money('Projected', 'basic_projected', 120),
    { title: '13th Month', dataIndex: 'amount', width: 130, align: 'right', render: (v) => <strong>{peso(v)}</strong> },
    money('Taxable (over ₱90k)', 'taxable_excess', 150),
    {
      title: 'Check',
      key: 'warnings',
      width: 80,
      render: (_, r) => (r.warnings?.length
        ? <Tooltip title={r.warnings.join(' · ')}><Tag color='orange'>{r.warnings.length}</Tag></Tooltip>
        : <Typography.Text type='secondary'>—</Typography.Text>),
    },
  ];

  const footer = run && (
    <Space wrap>
      {isDraft && canCancel && <Button color='orange' variant='outlined' icon={<CloseCircleOutlined />} onClick={() => setCancelling(true)}>Cancel</Button>}
      {run.status !== 'Cancelled' && <Button color='purple' variant='outlined' icon={<FileExcelOutlined />} loading={busy === 'download'} onClick={() => download(run)}>Register (Excel)</Button>}
      {run.status !== 'Cancelled' && (
        <Button
          color='purple'
          variant='outlined'
          icon={<BankOutlined />}
          onClick={() => setBank({
            title: `Bank File — ${run.year} 13th Month`,
            approved: run.status === 'Approved',
            filename: `13th_Month_Bank_${run.year}.csv`,
            load: () => thirteenthMonthApi.bank(run.id),
            download: () => thirteenthMonthApi.bankDownload(run.id),
          })}
        >
          Bank File
        </Button>
      )}
      {isDraft && canGenerate && (
        <Button icon={<ReloadOutlined />} loading={busy === 'regenerate'} onClick={() => act('regenerate', () => thirteenthMonthApi.generate({ year: run.year, pay_date: run.pay_date, remarks: run.remarks }))}>
          Regenerate
        </Button>
      )}
      {isDraft && canGenerate && (
        <Popconfirm
          title='Submit this 13th-month pay for approval?'
          description={<div style={{ maxWidth: 320 }}>It can&apos;t be regenerated while waiting for approval — an approver returns it if a change is needed.</div>}
          okText='Submit'
          onConfirm={() => act('submit', () => thirteenthMonthApi.submit(run.id))}
        >
          <Button color='cyan' variant='outlined' icon={<SendOutlined />} loading={busy === 'submit'}>Submit for Approval</Button>
        </Popconfirm>
      )}
      {canDecide && (
        <Button
          danger
          icon={<StopOutlined />}
          loading={busy === 'disapprove'}
          onClick={() => {
            if (!remarks.trim()) { message.error('Give the reason for disapproving'); return; }
            act('disapprove', () => thirteenthMonthApi.disapprove(run.id, remarks.trim()));
          }}
        >
          Disapprove
        </Button>
      )}
      {canDecide && (
        <Popconfirm
          title={lastApproval ? 'Approve and release this 13th-month pay?' : 'Approve this 13th-month pay?'}
          description={(
            <div style={{ maxWidth: 340 }}>
              {lastApproval
                ? 'This is the last approval: it can\'t be regenerated or cancelled after, and the amounts count in the year-end tax.'
                : `Your approval is recorded; it still needs ${levelInfo ? levelInfo.required - levelInfo.approved - 1 : 'more'} more.`}
            </div>
          )}
          okText='Approve'
          onConfirm={() => act('approve', () => thirteenthMonthApi.approve(run.id, remarks.trim() || null))}
        >
          <Button type='primary' icon={<CheckCircleOutlined />} loading={busy === 'approve'}>Approve</Button>
        </Popconfirm>
      )}
      {ownSubmission && canApprove && <Typography.Text type='secondary'>You submitted it — another approver decides it.</Typography.Text>}
    </Space>
  );

  return (
    <div>
      <Space wrap style={{ marginBottom: 12, width: '100%', justifyContent: 'flex-end' }}>
        <Button icon={<ReloadOutlined />} onClick={fetchRuns} loading={loading}>Refresh</Button>
        {canGenerate && <Button type='primary' icon={<PlusOutlined />} onClick={openGenerate}>Generate 13th Month</Button>}
      </Space>
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={runs}
        loading={loading}
        scroll={{ x: 1000 }}
        pagination={tablePagination(10)}
        locale={{ emptyText: 'No 13th-month pay generated yet' }}
      />

      <Modal
        open={genOpen}
        title='Generate 13th-month Pay'
        okText='Generate'
        onOk={generate}
        confirmLoading={generating}
        onCancel={() => setGenOpen(false)}
        forceRender
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='year' label='Year' rules={[{ required: true, message: 'Give the year' }]}>
            <InputNumber min={2000} max={2100} style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name='pay_date' label='Pay Date' extra='On or before December 24 (PD 851).'>
            <DatePicker format={DISPLAY_DATE_FORMAT} />
          </Form.Item>
          <Form.Item name='remarks' label='Remarks'>
            <Input.TextArea rows={2} maxLength={2000} />
          </Form.Item>
          <Typography.Paragraph type='secondary' style={{ marginBottom: 0 }}>
            Every employee paid in the year&apos;s approved payrolls: basic salary earned (basic pay and paid leave, less absences, late, undertime and unpaid leave, plus salary differentials — no overtime, premiums or allowances), plus the months not yet paid at the monthly rate in force, ÷ 12. Daily-paid months not yet paid aren&apos;t projected. A draft can be generated again as payrolls are approved.
          </Typography.Paragraph>
        </Form>
      </Modal>

      <Modal
        open={!!viewId}
        title={run ? `13th-month Pay — ${run.year}` : '13th-month Pay'}
        onCancel={() => setViewId(null)}
        afterOpenChange={(isOpen) => { if (isOpen) loadView(viewId); else { setView(null); setSearch(''); setRemarks(''); } }}
        destroyOnHidden
        width={{ xs: '100%', sm: '95%', xl: 1150 }}
        footer={footer}
      >
        {!run ? <Spin style={{ display: 'block', margin: '32px auto' }} /> : (
          <>
            <Descriptions
              size='small'
              bordered
              column={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 3 }}
              style={{ marginBottom: 12 }}
              items={[
                { key: 'status', label: 'Status', children: <Tag color={RUN_STATUS_COLORS[run.status]}>{run.status}</Tag> },
                { key: 'earned', label: 'Earned Through', children: formatDate(run.earned_through, 'no approved payroll yet') },
                { key: 'pay', label: 'Pay Date', children: formatDate(run.pay_date, '—') },
                { key: 'count', label: 'Employees', children: run.employee_count },
                { key: 'total', label: 'Total', children: <strong>{peso(run.total_amount)}</strong> },
                { key: 'gen', label: 'Generated', children: `${when(run.generated_at)} · ${run.generator?.name || '—'}` },
                run.status === 'Approved'
                  ? { key: 'appr', label: 'Approved', children: `${when(run.approved_at)} · ${run.approver?.name || '—'}` }
                  : run.status === 'Cancelled'
                    ? { key: 'canc', label: 'Cancelled', children: `${when(run.cancelled_at)} · ${run.canceller?.name || '—'} — ${run.cancel_reason}` }
                    : { key: 'rem', label: 'Remarks', children: run.remarks || '—' },
              ]}
            />
            {isDraft && (
              <Alert
                type='info'
                showIcon
                style={{ marginBottom: 8 }}
                title={`A draft: earned from the approved payrolls through ${formatDate(run.earned_through, '—')}, the rest of ${run.year} projected. Regenerate after more payrolls are approved; submit for approval when final.`}
              />
            )}
            {returned && (
              <Alert
                type='error'
                showIcon
                style={{ marginBottom: 8 }}
                title={`Returned by ${run.actor?.name || '—'} on ${when(run.acted_at)}`}
                description={run.action_remarks}
              />
            )}
            {run.submitted_at && (
              <Row gutter={16} style={{ marginBottom: 12 }}>
                <Col xs={24} md={12}>
                  <Typography.Title level={5} style={{ marginTop: 0 }}>Approval Route</Typography.Title>
                  <ApprovalSteps approval={approval} chartName='13th Month Pay' />
                </Col>
                <Col xs={24} md={12}>
                  <Typography.Title level={5} style={{ marginTop: 0 }}>History</Typography.Title>
                  <FilingHistory
                    record={{ created_at: run.submitted_at, filer: run.submitter, status: run.status, acted_at: run.acted_at, actor: run.actor, action_remarks: run.action_remarks }}
                    history={approval?.history}
                    filedLabel='Submitted'
                  />
                </Col>
              </Row>
            )}
            {canDecide && (
              <Input.TextArea
                rows={2}
                maxLength={2000}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder='Remarks (required to disapprove)'
                style={{ marginBottom: 12 }}
              />
            )}
            {withWarnings > 0 && <Alert type='warning' showIcon style={{ marginBottom: 8 }} title={`${withWarnings} employee(s) have something to check (Check column).`} />}
            <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'flex-end' }}>
              <Input.Search allowClear placeholder='Code or name' onSearch={(v) => setSearch(v.trim())} onChange={(e) => !e.target.value && setSearch('')} style={{ width: 220 }} />
            </Space>
            <Table
              rowKey='id'
              size='small'
              columns={payColumns}
              dataSource={pays}
              pagination={tablePagination(20)}
              scroll={{ x: 950 }}
              expandable={{
                expandIcon: (props) => <ExpandIcon {...props} />,
                expandedRowRender: (r) => (
                  <Space size={[4, 4]} wrap>
                    {Object.entries(r.months || {}).map(([m, v]) => <Tag key={m}>{`${dayjs(`${m}-01`).format('MMM')}: ${peso(v)}`}</Tag>)}
                  </Space>
                ),
                rowExpandable: (r) => Object.keys(r.months || {}).length > 0,
              }}
              summary={() => pays.length > 1 && (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}><strong>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align='right'><strong>{peso(sumOf(pays, 'basic_earned'))}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align='right'><strong>{peso(sumOf(pays, 'basic_projected'))}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align='right'><strong>{peso(sumOf(pays, 'amount'))}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align='right'><strong>{peso(sumOf(pays, 'taxable_excess'))}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={7} />
                </Table.Summary.Row>
              )}
            />
          </>
        )}
      </Modal>

      <ReasonModal
        open={cancelling}
        title='Cancel 13th-month Pay'
        label='Reason for cancelling'
        okText='Cancel 13th Month'
        danger
        onSubmit={async (reason) => {
          try {
            const { data } = await thirteenthMonthApi.cancel(run.id, reason);
            message.success(data.message);
            setCancelling(false);
            await Promise.all([fetchRuns(), loadView(run.id)]);
          } catch (error) {
            handleApiError(error, message);
            throw error;
          }
        }}
        onClose={() => setCancelling(false)}
      />
      <BankFileModal target={bank} onClose={() => setBank(null)} />
    </div>
  );
};

export default ThirteenthMonthIndex;
