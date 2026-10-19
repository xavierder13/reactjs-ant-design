import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Space, Button, Spin, Typography, Progress, Modal, Input, Select, Popconfirm, Alert, Statistic, Row, Col, App,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined, PrinterOutlined, ReloadOutlined } from '@ant-design/icons';
import clearanceApi from '../../services/clearance/clearanceApi';
import handleApiError from '../../utils/handleApiError';
import { formatDate } from '../../utils/formatDate';
import { peso } from '../payroll/payrollHelpers';
import ApprovalSteps from '../../components/approval/ApprovalSteps';
import FilingHistory from '../../components/approval/FilingHistory';
import { CLEARANCE_STATUS_COLORS, statusLabel, isOverdue, separationLabel } from './clearanceHelpers';
import ClearanceItemCard from './ClearanceItemCard';
import ClearanceFormModal from './ClearanceFormModal';
import AccountabilityModal from './AccountabilityModal';
import ClearanceStageSteps from './ClearanceStageSteps';

// Every prompt: title, button, whether a reason is required, a hint,
// whether the button is red, and whether a component must be chosen.
const promptsFor = (c, item) => ({
  return_to: { title: `Return from ${item?.department_name || ''}`, ok: 'Return', required: true, danger: true, target: true, placeholder: 'What must be corrected (required)', hint: 'That component clears again, then the clearance comes back here.' },
  return: { title: 'Return for Correction', ok: 'Return', required: true, danger: true, target: true, placeholder: 'What must be corrected (required)', hint: 'The component reopens; once it clears again the clearance goes through final approval again.' },
  cancel: { title: `Cancel Clearance ${c.clearance_no}`, ok: 'Cancel Clearance', required: true, danger: true, placeholder: 'Reason for cancelling (required)' },
  reopen: { title: `Reopen ${item?.department_name || ''}`, ok: 'Reopen', required: true, placeholder: 'Reason for reopening (required)' },
  revert: { title: `Revert ${item?.department_name || ''}`, ok: 'Revert', required: true, placeholder: 'Reason for reverting (required)' },
});

// A card's server state: it remounts (drops local edits) only when its own
// component changed on the server, not when another one saved.
const itemKey = (item) => `${item.id}:${item.status}:${item.is_current}:${JSON.stringify(item.checklist)}:${item.remarks || ''}`;

// One clearance (/clearances/:id) following its template: the components
// clear one after another (ClearanceStageSteps), only the current one by its
// in-charge (or HR); the current in-charge may return it to an earlier
// component. After the last one: final approval on the "Clearance" Access
// Chart (Approve / Return for Correction to a component). Also the
// separation, progress, accountabilities, history, Edit / Cancel (HR),
// Reopen (HR) / Revert (Administrator) a cleared component, Print.
const ClearanceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [data, setData] = useState(null);
  const [options, setOptions] = useState({ separation_types: [], accountability_statuses: [], assignees: [], templates: [] });
  const [editOpen, setEditOpen] = useState(false);
  const [acc, setAcc] = useState(null); // { item, accountability, asset, line }
  const [prompt, setPrompt] = useState(null); // { kind, item? }
  const [remarks, setRemarks] = useState('');
  const [target, setTarget] = useState(null);
  const [acting, setActing] = useState(null);

  const load = async () => {
    try {
      const { data: res } = await clearanceApi.show(id);
      setData(res);
    } catch (error) {
      handleApiError(error, message);
      if (error.response?.status === 404) navigate('/clearances');
    }
  };

  useEffect(() => {
    const run = async () => { await load(); };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: res } = await clearanceApi.options();
        setOptions(res);
      } catch (error) {
        handleApiError(error, message);
      }
    };
    run();
  }, [message]);

  const applyPayload = (res) => setData((d) => ({ ...d, ...res }));

  // components a return may go to: cleared ones (before the current one
  // when an in-charge returns)
  const targetsFor = (kind, item) => (data?.items || []).filter((i) => i.status === 'Cleared'
    && (kind !== 'return_to' || i.sequence < item.sequence));

  const openPrompt = (kind, item = null) => {
    setRemarks('');
    const targets = ['return_to', 'return'].includes(kind) ? targetsFor(kind, item) : [];
    setTarget(targets.length ? targets[targets.length - 1].id : null);
    setPrompt({ kind, item });
  };

  const approve = async () => {
    setActing('approve');
    try {
      const { data: res } = await clearanceApi.act('approve', id, { remarks: null });
      message.success(res.message);
      applyPayload(res);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setActing(null);
    }
  };

  const submitPrompt = async () => {
    const cfg = promptsFor(data.clearance, prompt.item)[prompt.kind];
    if (cfg.required && !remarks.trim()) { message.error('Give the reason'); return; }
    if (cfg.target && !target) { message.error('Choose the component to return it to'); return; }
    setActing(prompt.kind);
    try {
      let res;
      const note = remarks.trim();
      if (prompt.kind === 'return_to') res = (await clearanceApi.returnTo(prompt.item.id, target, note)).data;
      if (prompt.kind === 'return') res = (await clearanceApi.act('return', id, { remarks: note, target_item_id: target })).data;
      if (prompt.kind === 'cancel') res = (await clearanceApi.cancel(id, note)).data;
      if (prompt.kind === 'reopen') res = (await clearanceApi.reopen(prompt.item.id, note)).data;
      if (prompt.kind === 'revert') res = (await clearanceApi.revert(prompt.item.id, note)).data;
      message.success(res.message);
      applyPayload(res);
      setPrompt(null);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setActing(null);
    }
  };

  if (!data) return <Spin style={{ display: 'block', margin: '64px auto' }} />;

  const c = data.clearance;
  const decidable = !!data.approval?.can_approve;
  const PROMPTS = promptsFor(c, prompt?.item);
  const applicable = data.items.filter((i) => i.status !== 'Not Applicable');
  const cleared = applicable.filter((i) => i.status === 'Cleared').length;
  const current = data.items.find((i) => i.is_current);
  const history = data.approval?.history || [];
  const lastStep = history[history.length - 1];
  const returned = lastStep && ['Returned', 'Disapproved'].includes(lastStep.action) && c.status === 'In Progress' ? lastStep : null;

  return (
    <div>
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/clearances')}>Clearances</Button>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
          <Button color='purple' variant='outlined' icon={<PrinterOutlined />} onClick={() => navigate(`/clearances/${c.id}/print`)}>Print Form</Button>
          {data.can.edit && <Button color='green' variant='outlined' icon={<EditOutlined />} onClick={() => setEditOpen(true)}>Edit</Button>}
          {data.can.cancel && <Button color='orange' variant='outlined' onClick={() => openPrompt('cancel')}>Cancel Clearance</Button>}
          {decidable && <Button danger onClick={() => openPrompt('return')}>Return for Correction</Button>}
          {decidable && (
            <Popconfirm title='Approve this clearance?' description='The employee is cleared after the last level.' onConfirm={approve}>
              <Button type='primary' loading={acting === 'approve'}>Approve</Button>
            </Popconfirm>
          )}
        </Space>
      </Space>

      <Card size='small' style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align='middle'>
          <Col xs={24} lg={17}>
            <Descriptions
              size='small'
              column={{ xs: 1, sm: 2, xl: 3 }}
              items={[
                { key: 'no', label: 'Clearance No.', children: <strong>{c.clearance_no}</strong> },
                { key: 'status', label: 'Status', children: <Tag color={CLEARANCE_STATUS_COLORS[c.status]}>{statusLabel(c.status, c.current_level)}{current ? ` · ${current.department_name}` : ''}</Tag> },
                { key: 'employee', label: 'Employee', children: c.employee ? `${c.employee.employee_code} - ${c.employee.full_name}` : '—' },
                { key: 'position', label: 'Position', children: c.employee?.position?.name || '—' },
                { key: 'branch', label: 'Branch / Department', children: [c.employee?.branch?.name, c.employee?.department?.name].filter(Boolean).join(' / ') || '—' },
                { key: 'template', label: 'Template', children: c.template_name || '—' },
                { key: 'type', label: 'Separation', children: separationLabel(c) },
                { key: 'last', label: 'Last Day of Work', children: formatDate(c.last_day_of_work) },
                { key: 'due', label: 'Clear By', children: isOverdue(c) ? <Tag color='red'>{`${formatDate(c.due_date)} · past due`}</Tag> : formatDate(c.due_date) },
                { key: 'by', label: 'Started By', children: c.creator?.name || '—' },
                ...(c.cleared_at ? [{ key: 'cleared', label: 'Cleared On', children: formatDate(c.cleared_at) }] : []),
                ...(c.remarks ? [{ key: 'remarks', label: 'Remarks', children: c.remarks, span: 'filled' }] : []),
              ]}
            />
          </Col>
          <Col xs={24} lg={7}>
            <Space orientation='vertical' style={{ width: '100%' }}>
              <Progress
                percent={applicable.length ? Math.round((cleared / applicable.length) * 100) : 0}
                format={() => `${cleared}/${applicable.length}`}
                status={c.status === 'Cancelled' ? 'exception' : (c.status === 'Cleared' ? 'success' : 'active')}
              />
              <Row gutter={16}>
                <Col span={12}><Statistic title='Unsettled' value={peso(data.totals.unsettled)} styles={{ content: { fontSize: 16 } }} /></Col>
                <Col span={12}><Statistic title='Deduct from Final Pay' value={peso(data.totals.deduct)} styles={{ content: { fontSize: 16 } }} /></Col>
              </Row>
            </Space>
          </Col>
        </Row>
        {c.status === 'Cancelled' && (
          <Alert type='warning' showIcon style={{ marginTop: 12 }} title={`Cancelled${c.action_remarks ? ` — ${c.action_remarks}` : ''}`} />
        )}
        {returned && (
          <Alert type='error' showIcon style={{ marginTop: 12 }} title={`${returned.action === 'Disapproved' ? 'Returned at final approval' : 'Returned'} — ${returned.name || ''}`} description={returned.remarks} />
        )}
        <ClearanceStageSteps clearance={c} items={data.items} approval={data.approval} />
      </Card>

      <Typography.Title level={5}>Components</Typography.Title>
      {data.items.map((item) => (
        <ClearanceItemCard
          key={itemKey(item)}
          item={item}
          current={current}
          assignees={options.assignees || []}
          canReturn={item.can_sign && targetsFor('return_to', item).length > 0}
          onChanged={applyPayload}
          onAccountability={(it, accountability, asset, line) => setAcc({ item: it, accountability, asset, line })}
          onReturn={(it) => openPrompt('return_to', it)}
          onReopen={(it) => openPrompt('reopen', it)}
          onRevert={(it) => openPrompt('revert', it)}
        />
      ))}

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Typography.Title level={5} style={{ marginTop: 8 }}>Final Approval</Typography.Title>
          <ApprovalSteps approval={data.approval} chartName='Clearance' />
        </Col>
        <Col xs={24} md={12}>
          <Typography.Title level={5} style={{ marginTop: 8 }}>History</Typography.Title>
          <FilingHistory
            record={{ created_at: c.created_at, filer: c.creator, status: c.status === 'Cancelled' ? 'Cancelled' : c.status, acted_at: c.acted_at, actor: null, action_remarks: c.action_remarks }}
            history={history}
            filedLabel='Started'
          />
        </Col>
      </Row>

      <ClearanceFormModal
        open={editOpen}
        clearance={c}
        separationTypes={options.separation_types}
        templates={options.templates || []}
        onClose={() => setEditOpen(false)}
        onSaved={() => { setEditOpen(false); load(); }}
      />
      <AccountabilityModal
        open={!!acc}
        itemId={acc?.item?.id}
        accountability={acc?.accountability}
        asset={acc?.asset}
        line={acc?.line}
        statuses={options.accountability_statuses}
        onClose={() => setAcc(null)}
        onSaved={(res) => { setAcc(null); applyPayload(res); }}
      />
      <Modal
        keyboard={false}
        open={!!prompt}
        title={prompt ? PROMPTS[prompt.kind].title : ''}
        okText={prompt ? PROMPTS[prompt.kind].ok : 'OK'}
        okButtonProps={{ danger: !!prompt && !!PROMPTS[prompt.kind].danger }}
        confirmLoading={!!acting && acting !== 'approve'}
        onOk={submitPrompt}
        onCancel={() => setPrompt(null)}
        destroyOnHidden
      >
        {prompt && PROMPTS[prompt.kind].hint && <Alert type='info' showIcon style={{ marginBottom: 12 }} title={PROMPTS[prompt.kind].hint} />}
        {prompt?.kind === 'revert' && (
          <Alert
            type='warning'
            showIcon
            style={{ marginBottom: 12 }}
            title={c.status === 'Cleared' ? 'The clearance is Cleared — reverting opens it again.' : 'This component goes back to pending.'}
            description='It clears again; then the clearance goes through final approval again.'
          />
        )}
        {prompt && PROMPTS[prompt.kind].target && (
          <div style={{ marginBottom: 12 }}>
            <Typography.Text>Return it to:</Typography.Text>
            <Select
              value={target}
              onChange={setTarget}
              style={{ width: '100%', marginTop: 6 }}
              options={targetsFor(prompt.kind, prompt.item).map((i) => ({ value: i.id, label: `${i.sequence}. ${i.department_name}${i.cleared_by ? ` — cleared by ${i.cleared_by}` : ''}` }))}
            />
          </div>
        )}
        <Input.TextArea rows={3} maxLength={2000} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={prompt ? PROMPTS[prompt.kind].placeholder : ''} />
      </Modal>
    </div>
  );
};

export default ClearanceView;
