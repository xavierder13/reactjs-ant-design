import { useState } from 'react';
import {
  Modal, Descriptions, Tag, Input, Button, Space, Popconfirm, Typography, Spin, App,
} from 'antd';
import leaveApi from '../../services/leave/leaveApi';
import handleApiError from '../../utils/handleApiError';
import ApprovalSteps from '../../components/approval/ApprovalSteps';
import FilingHistory from '../../components/approval/FilingHistory';
import PaidTag from '../../components/approval/PaidTag';
import useAuth from '../../hooks/useAuth';
import filingAccess from '../../utils/filingAccess';
import { LEAVE_STATUS_COLORS, leaveDates, num } from './leaveHelpers';

// A leave (fetched: /leave/show): a summary, its details and balance, its
// approval route (Access Chart levels — who approved, who can act now) and
// history (filed, each decision, cancellation), and the actions this
// user may take: Approve / Disapprove when the backend says can_approve
// (current-level approver, once, not their own leave), Cancel with
// leave-cancel. Remarks are optional except for Disapprove.
const LeaveDetailsModal = ({ leaveId, onClose, onActed }) => {
  const access = filingAccess(useAuth(), 'leave');
  const { isAdmin } = access;
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
  // paid (retro adjustment instead) or in a payroll waiting for approval: Administrator only
  const cancellable = access.canCancel(leave) && ['Pending', 'Approved'].includes(leave?.status) && (isAdmin || (!leave?.paid_in && !leave?.pending_in));

  return (
    <Modal
      keyboard={false}
      open={!!leaveId}
      title='Leave Details'
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={{ xs: '100%', sm: '95%', md: 820 }}
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
          <Descriptions
            size='small'
            column={{ xs: 1, sm: 2 }}
            style={{ marginBottom: 16 }}
            items={[
              { key: 'employee', label: 'Employee', children: leave.employee ? `${leave.employee.employee_code} - ${leave.employee.full_name}` : '—' },
              { key: 'status', label: 'Status', children: <><Tag color={LEAVE_STATUS_COLORS[leave.status]}>{leave.status}</Tag><PaidTag paidIn={leave.paid_in} pendingIn={leave.pending_in} /></> },
              { key: 'branch', label: 'Branch / Position', children: [leave.employee?.branch?.name, leave.employee?.position?.name].filter(Boolean).join(' / ') || '—' },
              {
                key: 'type',
                label: 'Leave Type',
                children: (
                  <>
                    {leave.leave_type?.name}
                    {leave.leave_type && !leave.leave_type.is_paid && <Tag style={{ marginLeft: 8 }}>Unpaid</Tag>}
                  </>
                ),
              },
              { key: 'dates', label: 'Dates', children: leaveDates(leave) },
              {
                key: 'days',
                label: 'Days',
                children: (
                  <>
                    <strong>{num(leave.days)}</strong>
                    {Number(leave.unpaid_days) > 0 && (
                      <Typography.Text type='warning'>{` — ${num(leave.unpaid_days)} without credit, unpaid (deducted like an absence)`}</Typography.Text>
                    )}
                  </>
                ),
              },
            ]}
          />
          <Typography.Title level={5}>Details</Typography.Title>
          <Descriptions
            size='small'
            bordered
            column={1}
            styles={{ label: { width: 170 } }}
            items={[
              ...(data.balance && data.balance.credits !== null ? [{
                key: 'balance',
                label: 'Balance',
                children: `${data.balance.balance} of ${data.balance.credits} left (${data.balance.used} used, ${data.balance.pending} pending incl. this)`,
              }] : []),
              { key: 'reason', label: 'Reason', children: leave.reason || '—' },
            ]}
          />

          <Typography.Title level={5} style={{ marginTop: 16 }}>Approval Route</Typography.Title>
          <ApprovalSteps approval={approval} chartName='Leave Application' />
          <Typography.Title level={5} style={{ marginTop: 16 }}>History</Typography.Title>
          <FilingHistory record={leave} history={approval.history} />

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
