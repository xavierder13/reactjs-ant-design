import { useState } from 'react';
import {
  Modal, Descriptions, Tag, Input, Button, Space, Popconfirm, Steps, Typography, Spin, Alert, App,
} from 'antd';
import leaveApi from '../../services/leave/leaveApi';
import handleApiError from '../../utils/handleApiError';
import { formatDate } from '../../utils/formatDate';
import { LEAVE_STATUS_COLORS, leaveDates, num } from './leaveHelpers';

const STEP_STATUS = { Approved: 'finish', Pending: 'process', Disapproved: 'error', Waiting: 'wait' };
const ACTION_COLORS = { Approved: 'green', Disapproved: 'red', Cancelled: 'default' };

// A leave's details (fetched: /leave/show), its approval route (Access Chart
// levels — who approved, who can act now) and history, and the actions this
// user may take: Approve / Disapprove when the backend says can_approve
// (current-level approver, once, not their own leave), Cancel with
// leave-cancel. Remarks are optional except for Disapprove.
const LeaveDetailsModal = ({ leaveId, canCancel, onClose, onActed }) => {
  const { message } = App.useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [acting, setActing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: res } = await leaveApi.show(leaveId);
      setData(res);
    } catch (error) {
      handleApiError(error, message);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleAfterOpenChange = (isOpen) => {
    if (isOpen) {
      setRemarks('');
      load();
    } else {
      setData(null);
    }
  };

  const act = async (action) => {
    if (action === 'disapprove' && !remarks.trim()) {
      message.error('Give the reason for disapproving');
      return;
    }
    setActing(action);
    try {
      const { data: res } = await leaveApi.act(action, leaveId, remarks.trim() || null);
      message.success(res.message);
      onActed();
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setActing(null);
    }
  };

  const leave = data?.leave;
  const approval = data?.approval;
  const decidable = !!approval?.can_approve;
  const cancellable = canCancel && ['Pending', 'Approved'].includes(leave?.status);

  return (
    <Modal
      open={!!leaveId}
      title='Leave Details'
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={760}
      footer={(
        <Space wrap>
          <Button onClick={onClose}>Close</Button>
          {cancellable && (
            <Popconfirm title='Cancel this leave?' description='The days go back to the balance.' onConfirm={() => act('cancel')}>
              <Button color='orange' variant='outlined' loading={acting === 'cancel'}>Cancel Leave</Button>
            </Popconfirm>
          )}
          {decidable && (
            <Button danger loading={acting === 'disapprove'} onClick={() => act('disapprove')}>Disapprove</Button>
          )}
          {decidable && (
            <Popconfirm title='Approve this leave?' onConfirm={() => act('approve')}>
              <Button type='primary' loading={acting === 'approve'}>Approve</Button>
            </Popconfirm>
          )}
        </Space>
      )}
    >
      {loading || !leave ? <Spin style={{ display: 'block', margin: '32px auto' }} /> : (
        <>
          <Descriptions size='small' bordered column={1} styles={{ label: { width: 170 } }}>
            <Descriptions.Item label='Employee'>
              {leave.employee ? `${leave.employee.employee_code} - ${leave.employee.full_name}` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label='Branch / Position'>
              {[leave.employee?.branch?.name, leave.employee?.position?.name].filter(Boolean).join(' / ') || '—'}
            </Descriptions.Item>
            <Descriptions.Item label='Leave Type'>
              {leave.leave_type?.name}{leave.leave_type && !leave.leave_type.is_paid && <Tag style={{ marginLeft: 8 }}>Unpaid</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label='Dates'>{leaveDates(leave)}</Descriptions.Item>
            <Descriptions.Item label='Days'>{num(leave.days)}</Descriptions.Item>
            {data.balance && data.balance.credits !== null && (
              <Descriptions.Item label='Balance'>
                {`${data.balance.balance} of ${data.balance.credits} left (${data.balance.used} used, ${data.balance.pending} pending incl. this)`}
              </Descriptions.Item>
            )}
            <Descriptions.Item label='Reason'>{leave.reason || '—'}</Descriptions.Item>
            <Descriptions.Item label='Status'><Tag color={LEAVE_STATUS_COLORS[leave.status]}>{leave.status}</Tag></Descriptions.Item>
            <Descriptions.Item label='Filed'>{`${formatDate(leave.created_at)} by ${leave.filer?.name || '—'}`}</Descriptions.Item>
            {leave.acted_at && (
              <Descriptions.Item label={leave.status}>
                {`${formatDate(leave.acted_at)} by ${leave.actor?.name || '—'}`}
                {leave.action_remarks && <div>{leave.action_remarks}</div>}
              </Descriptions.Item>
            )}
          </Descriptions>

          <Typography.Title level={5} style={{ marginTop: 16 }}>Approval</Typography.Title>
          {approval.levels.length ? (
            <Steps
              size='small'
              orientation='vertical'
              items={approval.levels.map((l) => ({
                status: STEP_STATUS[l.status],
                title: `Level ${l.level} — ${l.status}${l.required ? ` (${l.approved}/${l.required})` : ''}`,
                content: (
                  <Space orientation='vertical' size={2}>
                    {l.actions.map((a) => (
                      <span key={`${a.name}-${a.acted_at}`}>
                        <Tag color={ACTION_COLORS[a.action]}>{a.action}</Tag>
                        {`${a.name || '—'} · ${formatDate(a.acted_at)}`}{a.remarks ? ` — ${a.remarks}` : ''}
                      </span>
                    ))}
                    {l.status === 'Pending' && (
                      l.approvers.length
                        ? <Typography.Text type='secondary'>{`Waiting for: ${l.approvers.map((a) => a.name).join(', ')}`}</Typography.Text>
                        : <Typography.Text type='danger'>No approver covers this employee at this level — an Administrator can approve it.</Typography.Text>
                    )}
                  </Space>
                ),
              }))}
            />
          ) : (
            <Alert
              type='info'
              showIcon
              title={approval.configured
                ? 'This leave was filed before the approval procedure was set up — anyone with Leave approval permission decides it.'
                : 'No approval procedure is set up yet (Access Chart "Leave Application") — anyone with Leave approval permission decides it.'}
            />
          )}
          {approval.history.some((h) => h.action === 'Cancelled') && (
            <Typography.Paragraph type='secondary' style={{ marginTop: 8 }}>
              {approval.history.filter((h) => h.action === 'Cancelled').map((h) => `Cancelled by ${h.name} · ${formatDate(h.acted_at)}`).join('; ')}
            </Typography.Paragraph>
          )}

          {(decidable || cancellable) && (
            <Input.TextArea
              rows={2}
              maxLength={2000}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={decidable ? 'Remarks (required to disapprove)' : 'Remarks (optional)'}
              style={{ marginTop: 12 }}
            />
          )}
        </>
      )}
    </Modal>
  );
};

export default LeaveDetailsModal;
