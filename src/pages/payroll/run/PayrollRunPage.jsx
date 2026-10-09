import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Card, Spin, Descriptions, Table, Tag, Button, Space, Tooltip, Popconfirm, Typography, Alert, Input, Row, Col, Result, App } from 'antd';
import { ArrowLeftOutlined, EyeOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, SendOutlined, StopOutlined, FileExcelOutlined, BankOutlined, UsergroupAddOutlined, RollbackOutlined } from '@ant-design/icons';
import useAuth from '../../../hooks/useAuth';
import payrollRunApi from '../../../services/payroll/payrollRunApi';
import payrollReportApi from '../../../services/payroll/payrollReportApi';
import downloadBlobResponse from '../../../utils/downloadBlobResponse';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../../utils/formatDate';
import { cutoffLabel, peso } from '../payrollHelpers';
import { rateLabel } from '../../compensation/compensationHelpers';
import ReasonModal from '../ReasonModal';
import ApprovalSteps from '../../../components/approval/ApprovalSteps';
import FilingHistory from '../../../components/approval/FilingHistory';
import PayslipModal from './PayslipModal';
import BankFileModal from './BankFileModal';
import RegenerateEmployeesModal from './RegenerateEmployeesModal';
import { RUN_STATUS_COLORS, minutesText, daysText } from './runHelpers';

// a summary item two columns wide (half of a lg row, a whole sm row)
const WIDE = { xs: 1, sm: 2, md: 2, lg: 2, xl: 2, xxl: 2 };

const when = (v) => (v ? dayjs(v).format(`${DISPLAY_DATE_FORMAT} hh:mm A`) : '—');

// The payroll run page (/payroll-runs/:id — Payroll Runs → View): summary,
// its approval route and history ("Payroll Run" Access Chart), the pay
// register (one line per employee — gross, deductions, net) and each
// employee's payslip (PayslipModal). Draft: Cancel, Regenerate All,
// Generate Selected (ticked rows / RegenerateEmployeesModal), Submit for
// Approval; Pending, for a current approver: Approve (the last approval
// locks it) / Disapprove (remarks — back to Draft); Approved: Roll Back to
// Draft (payroll-run-rollback, reason). Payroll Register (Excel)
// and the Bank File (preview; CSV once approved) with payroll-report-view.
const PayrollRunPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const isAdmin = hasRole('Administrator');
  const perms = {
    canGenerate: isAdmin || hasPermission('payroll-run-generate'),
    canCancel: isAdmin || hasPermission('payroll-run-cancel'),
    canRollback: isAdmin || hasPermission('payroll-run-rollback'),
    canReport: isAdmin || hasPermission('payroll-report-view'),
  };
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [payslip, setPayslip] = useState(null);
  const [search, setSearch] = useState('');
  const [remarks, setRemarks] = useState('');
  const [bank, setBank] = useState(null);
  const [picked, setPicked] = useState([]); // ticked payslip rows (employee ids)
  const [regenerating, setRegenerating] = useState(null);
  const [rollingBack, setRollingBack] = useState(false);

  const load = async (runId = id) => {
    try {
      const { data: res } = await payrollRunApi.show(runId);
      setData(res);
    } catch (error) {
      if (error.response?.status === 404) setNotFound(true);
      else handleApiError(error, message);
    }
  };

  useEffect(() => {
    const run = async () => {
      setData(null);
      setNotFound(false);
      setRemarks('');
      setPicked([]);
      await load(id);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const act = async (kind, fn) => {
    setBusy(kind);
    try {
      const { data: res } = await fn();
      message.success(res.message);
      setRemarks('');
      await load(data.run.id);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setBusy(null);
    }
  };

  const run = data?.run;
  const isDraft = run?.status === 'Draft';
  const approval = data?.approval;
  const canDecide = run?.status === 'Pending' && !!approval?.can_approve;
  const levelInfo = approval?.levels?.find((l) => l.level === run?.current_level);
  // the approval that will lock it: the last level's last required approval
  const lastApproval = !approval?.levels?.length
    || (levelInfo && levelInfo.level === approval.levels[approval.levels.length - 1].level && levelInfo.approved + 1 >= levelInfo.required);
  const returned = isDraft && run?.acted_at && run?.action_remarks;
  const rolledBack = isDraft && run?.rolled_back_at && !run?.submitted_at;
  const employees = (data?.employees || []).filter((e) => !search || `${e.employee_code} ${e.full_name}`.toLowerCase().includes(search.toLowerCase()));
  const withWarnings = (data?.employees || []).filter((e) => e.warnings.length).length;

  const columns = [
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
    { title: 'Rate', key: 'rate', width: 150, render: (_, r) => rateLabel(r.pay_basis, r.basic_rate) },
    { title: 'Absent', dataIndex: 'absent_days', width: 75, align: 'right', render: daysText },
    { title: 'Late / UT', key: 'late', width: 110, align: 'right', render: (_, r) => minutesText(r.late_minutes + r.undertime_minutes) },
    { title: 'OT', dataIndex: 'ot_minutes', width: 80, align: 'right', render: minutesText },
    { title: 'Gross', dataIndex: 'gross_pay', width: 120, align: 'right', render: peso },
    { title: 'Deductions', dataIndex: 'total_deductions', width: 120, align: 'right', render: peso },
    { title: 'Net Pay', dataIndex: 'net_pay', width: 130, align: 'right', render: (v) => <strong>{peso(v)}</strong> },
    {
      title: 'Check',
      key: 'warnings',
      width: 90,
      render: (_, r) => (r.warnings.length
        ? <Tooltip title={r.warnings.join(' · ')}><Tag color='orange'>{r.warnings.length}</Tag></Tooltip>
        : <Typography.Text type='secondary'>—</Typography.Text>),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, r) => (
        <Tooltip title='View payslip'>
          <Button color='blue' variant='outlined' size='small' icon={<EyeOutlined />} onClick={() => setPayslip({ id: r.id, full_name: r.full_name })} />
        </Tooltip>
      ),
    },
  ];

  const downloadRegister = async () => {
    setBusy('register');
    try {
      const response = await payrollReportApi.registerDownload(run.id);
      if (await downloadBlobResponse(response, `Payroll_Register_${run.cutoff?.code}.xls`, message)) message.success('Payroll register downloaded.');
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setBusy(null);
    }
  };

  const reportActions = run && perms.canReport && run.status !== 'Cancelled' ? (
    <Space wrap>
      <Button color='purple' variant='outlined' icon={<FileExcelOutlined />} loading={busy === 'register'} onClick={downloadRegister}>Payroll Register</Button>
      <Button
        color='purple'
        variant='outlined'
        icon={<BankOutlined />}
        onClick={() => setBank({
          title: `Bank File — ${run.cutoff?.code}`,
          approved: run.status === 'Approved',
          filename: `Payroll_Bank_${run.cutoff?.code}.csv`,
          load: () => payrollReportApi.bank(run.id),
          download: () => payrollReportApi.bankDownload(run.id),
        })}
      >
        Bank File
      </Button>
    </Space>
  ) : null;

  const canRollback = run?.status === 'Approved' && perms.canRollback;
  const actions = run && ((isDraft && (perms.canGenerate || perms.canCancel)) || canDecide || canRollback) ? (
    <Space wrap>
      {canRollback && (
        <Button color='orange' variant='outlined' icon={<RollbackOutlined />} onClick={() => setRollingBack(true)}>Roll Back to Draft</Button>
      )}
      {isDraft && perms.canCancel && <Button color='orange' variant='outlined' icon={<CloseCircleOutlined />} onClick={() => setCancelling(true)}>Cancel Payroll</Button>}
      {isDraft && perms.canGenerate && (
        <Button icon={<UsergroupAddOutlined />} onClick={() => setRegenerating({ run, preselected: picked })}>
          {picked.length ? `Generate Selected (${picked.length})` : 'Generate Selected'}
        </Button>
      )}
      {isDraft && perms.canGenerate && (
        <Popconfirm
          title='Generate every employee again?'
          description={<div style={{ maxWidth: 320 }}>The whole payroll is computed again from today&apos;s attendance, leave, overtime, salary, deductions and Payroll Settings.</div>}
          okText='Regenerate All'
          onConfirm={() => act('regenerate', () => payrollRunApi.generate({ payroll_cutoff_id: run.payroll_cutoff_id, remarks: run.remarks }))}
        >
          <Button icon={<ReloadOutlined />} loading={busy === 'regenerate'}>Regenerate All</Button>
        </Popconfirm>
      )}
      {isDraft && perms.canGenerate && (
        <Popconfirm
          title='Submit this payroll for approval?'
          description={<div style={{ maxWidth: 320 }}>It can&apos;t be regenerated while waiting for approval — an approver returns it if a change is needed.</div>}
          okText='Submit'
          onConfirm={() => act('submit', () => payrollRunApi.submit(run.id))}
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
            act('disapprove', () => payrollRunApi.disapprove(run.id, remarks.trim()));
          }}
        >
          Disapprove
        </Button>
      )}
      {canDecide && (
        <Popconfirm
          title={lastApproval ? 'Approve and lock this payroll?' : 'Approve this payroll?'}
          description={(
            <div style={{ maxWidth: 340 }}>
              {lastApproval
                ? 'This is the last approval: loan / deduction payments are posted, this cut-off\'s retro adjustments are marked Applied and its filing is turned off. An approved payroll is locked — corrections go through a retro adjustment, or a rollback to Draft.'
                : `Your approval is recorded; it still needs ${levelInfo ? levelInfo.required - levelInfo.approved - 1 : 'more'} more.`}
            </div>
          )}
          okText='Approve'
          onConfirm={() => act('approve', () => payrollRunApi.approve(run.id, remarks.trim() || null))}
        >
          <Button type='primary' icon={<CheckCircleOutlined />} loading={busy === 'approve'}>Approve</Button>
        </Popconfirm>
      )}
    </Space>
  ) : null;

  if (notFound) {
    return <Result status='404' title='Payroll not found' extra={<Button onClick={() => navigate('/payroll-runs')}>Back to Payroll Runs</Button>} />;
  }

  return (
    <div>
      <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }} wrap>
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/payroll-runs')}>Payroll Runs</Button>
          <Typography.Title level={4} style={{ margin: 0 }}>{run ? `Payroll — ${run.cutoff?.code}` : 'Payroll'}</Typography.Title>
          {run && <Tag color={RUN_STATUS_COLORS[run.status]}>{run.status}</Tag>}
        </Space>
        <Space wrap>
          {reportActions}
          {actions}
        </Space>
      </Space>
      <Card size='small'>
      {!data ? <Spin style={{ display: 'block', margin: '32px auto' }} /> : (
        <>
          <Descriptions
            size='small'
            bordered
            // every breakpoint set: one AntD fills in itself (3 columns) breaks
            // the 2-wide rows below ("Sum of column span … not match")
            column={{ xs: 1, sm: 2, md: 2, lg: 4, xl: 4, xxl: 4 }}
            style={{ marginBottom: 12 }}
            items={[
              { key: 'cutoff', label: 'Cut-off', children: cutoffLabel(run.cutoff) },
              { key: 'status', label: 'Status', children: <Tag color={RUN_STATUS_COLORS[run.status]}>{run.status}</Tag> },
              { key: 'pay', label: 'Pay Date', children: run.cutoff?.pay_date ? formatDate(run.cutoff.pay_date) : '—' },
              { key: 'employees', label: 'Employees', children: run.employee_count },
              { key: 'gross', label: 'Gross Pay', children: peso(run.gross_pay) },
              { key: 'deductions', label: 'Deductions', children: peso(run.total_deductions) },
              { key: 'net', label: 'Net Pay', children: <strong>{peso(run.net_pay)}</strong> },
              { key: 'er', label: 'Employer Share', children: peso(run.employer_share) },
              { key: 'generated', label: 'Generated', span: WIDE, children: `${when(run.generated_at)} · ${run.generator?.name || '—'}` },
              run.status === 'Approved'
                ? { key: 'approved', label: 'Approved', span: WIDE, children: `${when(run.approved_at)} · ${run.approver?.name || '—'}` }
                : run.status === 'Cancelled'
                  ? { key: 'cancelled', label: 'Cancelled', span: WIDE, children: `${when(run.cancelled_at)} · ${run.canceller?.name || '—'} — ${run.cancel_reason}` }
                  : { key: 'remarks', label: 'Remarks', span: WIDE, children: run.remarks || '—' },
            ]}
          />
          {returned && (
            <Alert
              type='error'
              showIcon
              style={{ marginBottom: 8 }}
              title={`Returned by ${run.actor?.name || '—'} on ${when(run.acted_at)}`}
              description={run.action_remarks}
            />
          )}
          {rolledBack && (
            <Alert
              type='warning'
              showIcon
              style={{ marginBottom: 8 }}
              title={`Rolled back from Approved by ${run.roller?.name || '—'} on ${when(run.rolled_back_at)}`}
              description={`${run.rollback_reason} — correct it, generate it again and submit it for approval again.`}
            />
          )}
          {run.skipped?.no_salary > 0 && (
            <Alert
              type='info'
              showIcon
              style={{ marginBottom: 8 }}
              title={`${run.skipped.no_salary} active employee(s) are not in this payroll — no salary saved in Salary History.`}
            />
          )}
          {withWarnings > 0 && (
            <Alert type='warning' showIcon style={{ marginBottom: 8 }} title={`${withWarnings} payslip(s) have something to check (Check column) — review them before approving.`} />
          )}
          {isDraft && (
            <Typography.Paragraph type='secondary' style={{ fontSize: 12 }}>
              A draft: after a change to attendance, leave, overtime, salary or deductions, generate the employees it affects again (tick them, then Generate Selected) or Regenerate All. Submit it for approval when the figures are final.
            </Typography.Paragraph>
          )}
          {run.submitted_at && (
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col xs={24} md={12}>
                <Typography.Title level={5} style={{ marginTop: 0 }}>Approval Route</Typography.Title>
                <ApprovalSteps approval={approval} chartName='Payroll Run' />
              </Col>
              <Col xs={24} md={12}>
                <Typography.Title level={5} style={{ marginTop: 0 }}>History</Typography.Title>
                <FilingHistory
                  record={{ created_at: run.submitted_at, filer: run.submitter, status: run.status === 'Draft' ? 'Draft' : run.status, acted_at: run.acted_at, actor: run.actor, action_remarks: run.action_remarks }}
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
          <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }} wrap>
            <Space>
              <Typography.Text strong>Pay Register</Typography.Text>
              {isDraft && perms.canGenerate && picked.length > 0 && (
                <Typography.Text type='secondary'>{picked.length} ticked — <Typography.Link onClick={() => setPicked([])}>clear</Typography.Link></Typography.Text>
              )}
            </Space>
            <Input.Search allowClear placeholder='Code or name' onSearch={(v) => setSearch(v.trim())} onChange={(e) => !e.target.value && setSearch('')} style={{ width: 220 }} />
          </Space>
          <Table
            rowKey='id'
            size='small'
            columns={columns}
            dataSource={employees}
            rowSelection={isDraft && perms.canGenerate ? {
              selectedRowKeys: (data?.employees || []).filter((e) => picked.includes(e.employee_id)).map((e) => e.id),
              preserveSelectedRowKeys: true,
              onChange: (keys) => setPicked((data?.employees || []).filter((e) => keys.includes(e.id)).map((e) => e.employee_id)),
            } : undefined}
            pagination={{ defaultPageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} employee(s)` }}
            scroll={{ x: 1200 }}
            summary={() => employees.length > 1 && (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5}><strong>Total</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={5} align='right'><strong>{peso(employees.reduce((t, e) => t + Number(e.gross_pay), 0))}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={6} align='right'><strong>{peso(employees.reduce((t, e) => t + Number(e.total_deductions), 0))}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={7} align='right'><strong>{peso(employees.reduce((t, e) => t + Number(e.net_pay), 0))}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={8} colSpan={2} />
              </Table.Summary.Row>
            )}
          />
        </>
      )}
      </Card>
      <PayslipModal target={payslip} onClose={() => setPayslip(null)} />
      <BankFileModal target={bank} onClose={() => setBank(null)} />
      <RegenerateEmployeesModal
        target={regenerating}
        onClose={() => setRegenerating(null)}
        onDone={async () => { setRegenerating(null); setPicked([]); await load(run.id); }}
      />
      <ReasonModal
        open={rollingBack}
        title={`Roll Back Payroll ${run?.cutoff?.code || ''} to Draft`}
        label='Reason for rolling back'
        okText='Roll Back'
        danger
        description={(
          <Alert
            type='warning'
            showIcon
            style={{ marginBottom: 12 }}
            title='The payroll is unlocked so it can be corrected and approved again.'
            description={(
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>The loan / deduction payments it posted are removed (balances return).</li>
                <li>Its retro adjustments are Open again.</li>
                <li>Payslips, remittances, the bank file and reports leave out this cut-off until it is approved again.</li>
                <li>Not allowed while a later payroll, or the year&apos;s 13th month, is approved or waiting for approval.</li>
              </ul>
            )}
          />
        )}
        onSubmit={async (reason) => {
          try {
            const { data: res } = await payrollRunApi.rollback(run.id, reason);
            message.success(res.message);
            setRollingBack(false);
            await load(run.id);
          } catch (error) {
            handleApiError(error, message);
            throw error; // keeps the reason dialog open
          }
        }}
        onClose={() => setRollingBack(false)}
      />
      <ReasonModal
        open={cancelling}
        title='Cancel Payroll'
        label='Reason for cancelling'
        okText='Cancel Payroll'
        danger
        onSubmit={async (reason) => {
          try {
            const { data: res } = await payrollRunApi.cancel(run.id, reason);
            message.success(res.message);
            setCancelling(false);
            await load(run.id);
          } catch (error) {
            handleApiError(error, message);
            throw error; // keeps the reason dialog open
          }
        }}
        onClose={() => setCancelling(false)}
      />
    </div>
  );
};

export default PayrollRunPage;
