import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Table, Tag, Button, Space, Tooltip, Modal, Form, Input, InputNumber, DatePicker, Descriptions, Alert, Typography, Popconfirm, Spin, Row, Col, Radio, Select, App,
} from 'antd';
import {
  EyeOutlined, PlusOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, FileExcelOutlined, BankOutlined, SendOutlined, StopOutlined, RollbackOutlined, UserAddOutlined, DeleteOutlined,
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
import { RUN_STATUS_COLORS, PICKER_MODAL_WIDTH } from '../run/runHelpers';
import EmployeePickerTable from '../run/EmployeePickerTable';
import { money, sumOf } from './reportHelpers';

const when = (v) => (v ? dayjs(v).format(`${DISPLAY_DATE_FORMAT} hh:mm A`) : '—');

// 13th-month pay (/thirteenth-month — thirteenth-month-list / -generate /
// -approve / -cancel): one batch per year (PD 851: the year's basic salary ÷
// 12). Generate makes / re-makes the Draft from the year's approved payrolls
// — for everyone, or only the employees chosen (candidates; on a Draft the
// others keep their lines), as on Payroll Runs —
// (basic pay + paid leave − absences / late / undertime + salary
// differentials), the rest of the year projected at the monthly rate in
// force. Submit sends it to the "13th Month Pay" Access Chart (the payroll
// run's approval: levels, required approvals, approvers; the submitter can't
// decide their own — Administrator bypasses); the last approval releases it
// (Approved), a disapproval (remarks) returns it to Draft. Excel register
// and bank file. Over ₱90,000 (with other benefits) is taxable — counted in
// the year-end tax. Roll Back Selected / All (thirteenth-month-rollback,
// reason) reopens approved employees — the batch goes back to Draft and
// through approval again, the others stay approved (locked, "Approved" tag)
// — only before the pay date (December 24 when none): once paid it can't be
// rolled back or generated again. An approved batch takes only employees
// not in it (Add Employees / Generate → Selected): it goes back to Draft and
// is approved again as its next round; the approved lines stay as they are.
// Rounds panel + round filter (the Register and Bank File follow it; a
// round's CSV is ready once that round is approved); Remove Selected takes
// not-yet-approved lines out of a Draft.
const ThirteenthMonthIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole, user } = useAuth();
  const isAdmin = hasRole('Administrator');
  const canGenerate = isAdmin || hasPermission('thirteenth-month-generate');
  const canApprove = isAdmin || hasPermission('thirteenth-month-approve');
  const canCancel = isAdmin || hasPermission('thirteenth-month-cancel');
  const canRollbackPerm = isAdmin || hasPermission('thirteenth-month-rollback');

  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [view, setView] = useState(null);
  const [busy, setBusy] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [rollingBack, setRollingBack] = useState(null); // { employeeIds: [...] | null (all) }
  const [picked, setPicked] = useState([]); // approved employee ids ticked for Roll Back Selected
  const [bank, setBank] = useState(null);
  const [search, setSearch] = useState('');
  const [remarks, setRemarks] = useState('');
  const [candidates, setCandidates] = useState(null); // { run, employees } of the year, for "Selected employees"
  const [form] = Form.useForm();
  const genYear = Form.useWatch('year', form);
  const scope = Form.useWatch('scope', form);
  const genRun = candidates?.run;
  const genAdding = genRun?.status === 'Approved'; // only employees not in it can be added
  const genLocked = !!candidates?.employees.some((c) => c.approved); // approved employees keep the pay date
  const [roundFilter, setRoundFilter] = useState('all'); // 'all' | round number | 'open'

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

  const loadCandidates = async (year) => {
    setCandidates(null);
    if (!year) return;
    try {
      const { data } = await thirteenthMonthApi.candidates(year);
      setCandidates({ run: data.run, employees: data.employees });
      // an approved batch: add employees only
      if (data.run?.status === 'Approved') form.setFieldsValue({ scope: 'selected' });
    } catch (error) {
      handleApiError(error, message);
    }
  };

  // New batch (no argument) or the open Draft's Regenerate (its year, pay
  // date and remarks) — both choose All / Selected employees here.
  const openGenerate = (draft = null) => {
    form.resetFields();
    const year = draft ? draft.year : dayjs().year();
    form.setFieldsValue({
      year,
      pay_date: draft ? (draft.pay_date ? dayjs(draft.pay_date) : null) : dayjs(`${year}-12-15`),
      remarks: draft?.remarks || undefined,
      scope: 'all',
    });
    loadCandidates(year);
    setGenOpen(true);
  };

  const handleValuesChange = (changed, all) => {
    if ('year' in changed) {
      form.setFieldsValue({ employee_ids: [] });
      loadCandidates(all.year);
    }
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
        ...(values.scope === 'selected' ? { employee_ids: values.employee_ids } : {}),
      });
      message.success(data.message);
      setGenOpen(false);
      await fetchRuns();
      if (viewId === data.run.id) await loadView(data.run.id);
      else { setView(null); setViewId(data.run.id); }
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

  const download = async (run, round) => {
    setBusy('download');
    try {
      const response = await thirteenthMonthApi.download(run.id, round);
      if (await downloadBlobResponse(response, `13th_Month_${run.year}${round ? `_Round${round}` : ''}.xls`, message)) message.success('13th-month register downloaded.');
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
  const rounds = view?.rounds || [];
  const notApproved = view?.not_approved || { employees: 0 };
  const showRounds = rounds.length > 1 || (rounds.length > 0 && notApproved.employees > 0);
  const roundNo = typeof roundFilter === 'number' ? roundFilter : null; // the Register / Bank File follow it
  const pays = (view?.pays || [])
    .filter((p) => !search || `${p.employee_code} ${p.full_name}`.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => (roundFilter === 'all' ? true : roundFilter === 'open' ? !p.approved : p.round === roundFilter));
  const isDraft = run?.status === 'Draft';
  const approval = view?.approval;
  const canDecide = run?.status === 'Pending' && !!approval?.can_approve;
  const ownSubmission = run?.status === 'Pending' && run.submitted_by === user?.id && !isAdmin;
  const levelInfo = approval?.levels?.find((l) => l.level === run?.current_level);
  // the approval that releases it: the last level's last required approval
  const lastApproval = !approval?.levels?.length
    || (levelInfo && levelInfo.level === approval.levels[approval.levels.length - 1].level && levelInfo.approved + 1 >= levelInfo.required);
  const returned = isDraft && run?.acted_at && run?.action_remarks;
  const rolledBack = isDraft && run?.rolled_back_at && !run?.submitted_at;
  // approved (released) lines are locked; a rollback reopens them, until the pay date
  const approvedIds = new Set((view?.pays || []).filter((p) => p.approved).map((p) => p.employee_id));
  const paid = !!run?.paid_on && dayjs().format('YYYY-MM-DD') >= run.paid_on;
  const canRollback = canRollbackPerm && !paid && (run?.status === 'Approved' || (isDraft && approvedIds.size > 0));
  const pickedRollback = picked.filter((eid) => approvedIds.has(eid));
  const canRemove = isDraft && canGenerate; // not-yet-approved lines out of a Draft
  const pickedRemovable = picked.filter((eid) => !approvedIds.has(eid));
  const sel = canRollback || canRemove ? 1 : 0; // the selection column shifts the totals row
  const withWarnings = (view?.pays || []).filter((p) => p.warnings?.length).length;

  const payColumns = [
    {
      title: 'Employee',
      key: 'employee',
      fixed: 'left',
      width: 230,
      render: (_, r) => (
        <div>
          <div>
            {r.full_name}
            {isDraft && r.approved && <Tag color='green' style={{ marginLeft: 6 }}>{rounds.length > 1 ? `Approved · R${r.round}` : 'Approved'}</Tag>}
            {!isDraft && r.approved && rounds.length > 1 && <Tag style={{ marginLeft: 6 }}>{`R${r.round}`}</Tag>}
            {!r.approved && rounds.length > 0 && (
              <Tooltip title='Added after the batch was approved — approved with the next round'>
                <Tag color='cyan' style={{ marginLeft: 6 }}>Added</Tag>
              </Tooltip>
            )}
          </div>
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
      {canRollback && pickedRollback.length > 0 && (
        <Button color='orange' variant='outlined' icon={<RollbackOutlined />} onClick={() => setRollingBack({ employeeIds: pickedRollback })}>
          {`Roll Back Selected (${pickedRollback.length})`}
        </Button>
      )}
      {canRollback && (
        <Button color='orange' variant='outlined' icon={<RollbackOutlined />} onClick={() => setRollingBack({ employeeIds: null })}>
          {run.status === 'Approved' ? 'Roll Back All' : `Roll Back All Approved (${approvedIds.size})`}
        </Button>
      )}
      {isDraft && canCancel && !approvedIds.size && <Button color='orange' variant='outlined' icon={<CloseCircleOutlined />} onClick={() => setCancelling(true)}>Cancel</Button>}
      {run.status === 'Approved' && canGenerate && (
        <Button icon={<UserAddOutlined />} onClick={() => openGenerate(run)}>Add Employees</Button>
      )}
      {canRemove && pickedRemovable.length > 0 && (
        <Popconfirm
          title={`Remove ${pickedRemovable.length} employee(s) from this 13th-month pay?`}
          description={<div style={{ maxWidth: 320 }}>Their lines (not approved yet) are taken out. Approved lines can&apos;t be removed.</div>}
          okText='Remove'
          okButtonProps={{ danger: true }}
          onConfirm={() => act('remove', async () => { const res = await thirteenthMonthApi.remove(run.id, pickedRemovable); setPicked([]); return res; })}
        >
          <Button danger icon={<DeleteOutlined />} loading={busy === 'remove'}>{`Remove Selected (${pickedRemovable.length})`}</Button>
        </Popconfirm>
      )}
      {run.status !== 'Cancelled' && <Button color='purple' variant='outlined' icon={<FileExcelOutlined />} loading={busy === 'download'} onClick={() => download(run, roundNo)}>{roundNo ? `Register (Round ${roundNo})` : 'Register (Excel)'}</Button>}
      {run.status !== 'Cancelled' && (
        <Button
          color='purple'
          variant='outlined'
          icon={<BankOutlined />}
          onClick={() => setBank({
            title: `Bank File — ${run.year} 13th Month${roundNo ? ` — Round ${roundNo}` : ''}`,
            // a round is approved by itself; the whole batch only when Approved
            approved: roundNo ? true : run.status === 'Approved',
            filenamePrefix: `13th_Month_Bank_${run.year}${roundNo ? `_Round${roundNo}` : ''}`,
            canChoose: canGenerate && !roundNo,
            load: () => thirteenthMonthApi.bank(run.id, roundNo),
            download: (sourceId) => thirteenthMonthApi.bankDownload(run.id, sourceId, roundNo),
            choose: (payload) => thirteenthMonthApi.paidFrom(run.id, payload),
          })}
        >
          {roundNo ? `Bank File (Round ${roundNo})` : 'Bank File'}
        </Button>
      )}
      {isDraft && canGenerate && (
        <Button icon={<ReloadOutlined />} onClick={() => openGenerate(run)}>
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
        {canGenerate && <Button type='primary' icon={<PlusOutlined />} onClick={() => openGenerate()}>Generate 13th Month</Button>}
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
        keyboard={false}
        open={genOpen}
        title='Generate 13th-month Pay'
        okText={genAdding ? 'Add Employees' : genRun?.status === 'Draft' ? 'Regenerate' : 'Generate'}
        onOk={generate}
        okButtonProps={{ disabled: genRun?.status === 'Pending' }}
        confirmLoading={generating}
        onCancel={() => setGenOpen(false)}
        width={scope === 'selected' ? PICKER_MODAL_WIDTH : 520}
        zIndex={1050} // above the batch's view modal (Regenerate opens it from there)
        forceRender
      >
        <Form form={form} layout='vertical' initialValues={{ scope: 'all' }} onValuesChange={handleValuesChange} disabled={generating}>
          <Form.Item name='year' label='Year' rules={[{ required: true, message: 'Give the year' }]}>
            <InputNumber min={2000} max={2100} style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name='pay_date' label='Pay Date' extra={genLocked ? 'Kept: employees in this batch are already approved for this date.' : 'On or before December 24 (PD 851).'}>
            <DatePicker format={DISPLAY_DATE_FORMAT} disabled={genLocked} />
          </Form.Item>
          {genRun?.status === 'Pending' && (
            <Alert
              type='warning'
              showIcon
              style={{ marginBottom: 12 }}
              title={`The ${genYear} 13th-month pay is waiting for approval — an approver returns it if a change is needed.`}
            />
          )}
          {genAdding && (
            <Alert
              type='info'
              showIcon
              style={{ marginBottom: 12 }}
              title={`The ${genYear} 13th-month pay is approved — only employees not in it can be added.`}
              description='They are computed now and the batch goes back to Draft; submit it so they are approved as its next round. The approved employees stay exactly as they are.'
            />
          )}
          {genRun?.status === 'Draft' && (
            <Alert
              type='info'
              showIcon
              style={{ marginBottom: 12 }}
              title={scope === 'selected'
                ? 'A draft already exists — only the chosen employees are computed again; the others keep their amounts.'
                : 'A draft already exists — generating again replaces every amount.'}
            />
          )}
          <Form.Item name='scope' label='Employees'>
            <Radio.Group
              options={[
                { value: 'all', label: 'All employees', disabled: genAdding },
                { value: 'selected', label: genAdding ? 'Selected employees (not in the batch yet)' : 'Selected employees' },
              ]}
            />
          </Form.Item>
          {scope === 'selected' && (
            <Form.Item name='employee_ids' rules={[{ required: true, message: 'Choose the employees' }]}>
              <EmployeePickerTable
                candidates={candidates && candidates.employees.filter((c) => (genAdding ? c.eligible && !c.in_run : c.eligible || c.in_run))}
                disabled={!genYear || genRun?.status === 'Pending'}
                busy={generating}
                showRunStatus={genRun?.status === 'Draft'}
              />
            </Form.Item>
          )}
          <Form.Item name='remarks' label='Remarks'>
            <Input.TextArea rows={2} maxLength={2000} />
          </Form.Item>
          <Typography.Paragraph type='secondary' style={{ marginBottom: 0 }}>
            Every active employee with a salary saved, paid in the year&apos;s approved payrolls: basic salary earned (basic pay and paid leave, less absences, late, undertime and unpaid leave, plus salary differentials — no overtime, premiums or allowances), plus the months not yet paid at the monthly rate in force, ÷ 12. Daily-paid months not yet paid aren&apos;t projected. A draft can be generated again as payrolls are approved.
          </Typography.Paragraph>
        </Form>
      </Modal>

      <Modal
        keyboard={false}
        open={!!viewId}
        title={run ? `13th-month Pay — ${run.year}` : '13th-month Pay'}
        onCancel={() => { setViewId(null); setPicked([]); setRoundFilter('all'); }}
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
            {paid && (run.status === 'Approved' || approvedIds.size > 0) && (
              <Alert
                type='info'
                showIcon
                style={{ marginBottom: 8 }}
                title={`Paid on ${formatDate(run.paid_on)} — the approved 13th month can't be rolled back or generated again. Correct it with an adjustment on a payroll.`}
              />
            )}
            {rolledBack && (
              <Alert
                type='warning'
                showIcon
                style={{ marginBottom: 8 }}
                title={`Rolled back from Approved by ${run.rollbacker?.name || '—'} on ${when(run.rolled_back_at)}`}
                description={`${run.rollback_reason} — correct it, generate it again and submit it for approval again.`}
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
            {showRounds && (
              <>
                <Typography.Title level={5} style={{ marginTop: 0 }}>Approval Rounds</Typography.Title>
                <Table
                  rowKey='key'
                  size='small'
                  style={{ marginBottom: 16 }}
                  pagination={false}
                  scroll={{ x: 900 }}
                  dataSource={[
                    ...rounds.map((r) => ({ ...r, key: `r${r.round}` })),
                    ...(notApproved.employees > 0 ? [{ key: 'open', round: null, ...notApproved }] : []),
                  ]}
                  columns={[
                    { title: 'Round', key: 'round', width: 150, render: (_, r) => (r.round ? `Round ${r.round}` : <Tag color='cyan'>Not approved yet</Tag>) },
                    { title: 'Employees', dataIndex: 'employees', width: 100, align: 'right', render: (v, r) => (r.round && !v ? <Typography.Text type='secondary'>0 — rolled back</Typography.Text> : v) },
                    { title: 'Total', dataIndex: 'total_amount', width: 130, align: 'right', render: (v) => <strong>{peso(v)}</strong> },
                    { title: 'Earned Through', dataIndex: 'earned_through', width: 120, render: (v, r) => (r.round ? formatDate(v, '—') : formatDate(run.earned_through, '—')) },
                    { title: 'Submitted', key: 'sub', width: 210, render: (_, r) => (r.round && r.submitted_at ? `${when(r.submitted_at)} · ${r.submitter || '—'}` : '—') },
                    { title: 'Approved', key: 'appr', width: 210, render: (_, r) => (r.round ? `${when(r.approved_at)} · ${r.approver || '—'}` : '—') },
                    {
                      title: 'Actions',
                      key: 'actions',
                      width: 80,
                      fixed: 'right',
                      render: (_, r) => (
                        <Tooltip title={r.round ? `Show round ${r.round} only` : 'Show the ones not approved yet'}>
                          <Button color='blue' variant='outlined' size='small' icon={<EyeOutlined />} onClick={() => setRoundFilter(r.round || 'open')} />
                        </Tooltip>
                      ),
                    },
                  ]}
                />
              </>
            )}
            <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'flex-end' }} wrap>
              {showRounds && (
                <Select
                  value={roundFilter}
                  onChange={setRoundFilter}
                  style={{ width: 190 }}
                  options={[
                    { value: 'all', label: 'All rounds' },
                    ...rounds.filter((r) => r.employees > 0).map((r) => ({ value: r.round, label: `Round ${r.round} (${r.employees})` })),
                    ...(notApproved.employees > 0 ? [{ value: 'open', label: `Not approved yet (${notApproved.employees})` }] : []),
                  ]}
                />
              )}
              <Input.Search allowClear placeholder='Code or name' onSearch={(v) => setSearch(v.trim())} onChange={(e) => !e.target.value && setSearch('')} style={{ width: 220 }} />
            </Space>
            <Table
              rowKey='id'
              size='small'
              columns={payColumns}
              dataSource={pays}
              pagination={tablePagination(20)}
              scroll={{ x: 950 }}
              rowSelection={canRollback || canRemove ? {
                selectedRowKeys: (view?.pays || []).filter((p) => picked.includes(p.employee_id)).map((p) => p.id),
                preserveSelectedRowKeys: true,
                onChange: (keys) => setPicked((view?.pays || []).filter((p) => keys.includes(p.id)).map((p) => p.employee_id)),
                // approved lines are ticked to roll back, the others to remove
                getCheckboxProps: (r) => ({ disabled: r.approved ? !canRollback : !canRemove }),
              } : undefined}
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
                  <Table.Summary.Cell index={0} colSpan={3 + sel}><strong>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={3 + sel} align='right'><strong>{peso(sumOf(pays, 'basic_earned'))}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={4 + sel} align='right'><strong>{peso(sumOf(pays, 'basic_projected'))}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={5 + sel} align='right'><strong>{peso(sumOf(pays, 'amount'))}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={6 + sel} align='right'><strong>{peso(sumOf(pays, 'taxable_excess'))}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={7 + sel} />
                </Table.Summary.Row>
              )}
            />
          </>
        )}
      </Modal>

      <ReasonModal
        open={!!rollingBack}
        title={rollingBack?.employeeIds
          ? `Roll Back ${rollingBack.employeeIds.length} Employee(s) — ${run?.year || ''} 13th Month`
          : `Roll Back the ${run?.year || ''} 13th Month to Draft`}
        label='Reason for rolling back'
        okText='Roll Back'
        danger
        description={(
          <Alert
            type='warning'
            showIcon
            style={{ marginBottom: 12 }}
            title={rollingBack?.employeeIds
              ? 'These employees are unlocked so they can be generated again; the batch goes back to Draft and the others stay approved.'
              : 'The batch is unlocked so it can be generated and approved again.'}
            description={(
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>The year-end tax and final pay leave them out until it is approved again.</li>
                <li>Not allowed on or after the pay date ({run ? formatDate(run.paid_on) : '—'}) — it is paid by then.</li>
              </ul>
            )}
          />
        )}
        onSubmit={async (reason) => {
          try {
            const { data } = await thirteenthMonthApi.rollback(run.id, reason, rollingBack.employeeIds);
            message.success(data.message);
            setRollingBack(null);
            setPicked([]);
            await Promise.all([fetchRuns(), loadView(viewId)]);
          } catch (error) {
            handleApiError(error, message);
            throw error; // keeps the reason dialog open
          }
        }}
        onClose={() => setRollingBack(null)}
      />
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
