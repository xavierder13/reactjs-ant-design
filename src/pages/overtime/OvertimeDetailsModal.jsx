import { useState } from 'react';
import { Modal, Descriptions, Tag, Input, Button, Space, Popconfirm, Typography, Spin, App } from 'antd';
import overtimeApi from '../../services/overtime/overtimeApi';
import handleApiError from '../../utils/handleApiError';
import { formatDate } from '../../utils/formatDate';
import ApprovalSteps from '../../components/approval/ApprovalSteps';
import FilingHistory from '../../components/approval/FilingHistory';
import { TIME_ENTRY_STATUS_COLORS, scheduleText, timeRange } from '../time_entry/timeEntryHelpers';
import PaidTag from '../../components/approval/PaidTag';
import useAuth from '../../hooks/useAuth';
import { DAY_TYPE_COLORS, hoursText, punchesText } from './overtimeHelpers';

// An overtime (fetched: /overtime/show): a summary, its details with that
// day's schedule, biometric reading and classification, its approval route
// and history (filed, each decision, cancellation), and the actions this
// user may take: Approve / Disapprove when the backend says can_approve,
// Cancel with overtime-cancel. Remarks required to disapprove.
const OvertimeDetailsModal = ({ overtimeId, canCancel, onClose, onActed }) => {
  const isAdmin = useAuth().hasRole('Administrator');
  const { message } = App.useApp();
  const [data, setData] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [acting, setActing] = useState(null);

  const handleAfterOpenChange = async (isOpen) => {
    if (!isOpen) { setData(null); return; }
    setRemarks('');
    try {
      const { data: res } = await overtimeApi.show(overtimeId);
      setData(res);
    } catch (error) {
      handleApiError(error, message);
      onClose();
    }
  };

  const act = async (action) => {
    if (action === 'disapprove' && !remarks.trim()) {
      message.error('Give the reason for disapproving');
      return;
    }
    setActing(action);
    try {
      const { data: res } = await overtimeApi.act(action, overtimeId, remarks.trim() || null);
      message.success(res.message);
      onActed();
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setActing(null);
    }
  };

  const ot = data?.overtime;
  const decidable = !!data?.approval?.can_approve;
  // paid (retro adjustment instead) or in a payroll waiting for approval: Administrator only
  const cancellable = canCancel && ['Pending', 'Approved'].includes(ot?.status) && (isAdmin || (!ot?.paid_in && !ot?.pending_in));

  return (
    <Modal
      open={!!overtimeId}
      title='Overtime Details'
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={{ xs: '100%', sm: '95%', md: 820 }}
      footer={(
        <Space wrap>
          <Button onClick={onClose}>Close</Button>
          {cancellable && (
            <Popconfirm title='Cancel this overtime?' onConfirm={() => act('cancel')}>
              <Button color='orange' variant='outlined' loading={acting === 'cancel'}>Cancel Overtime</Button>
            </Popconfirm>
          )}
          {decidable && <Button danger loading={acting === 'disapprove'} onClick={() => act('disapprove')}>Disapprove</Button>}
          {decidable && (
            <Popconfirm title='Approve this overtime?' onConfirm={() => act('approve')}>
              <Button type='primary' loading={acting === 'approve'}>Approve</Button>
            </Popconfirm>
          )}
        </Space>
      )}
    >
      {!ot ? <Spin style={{ display: 'block', margin: '32px auto' }} /> : (
        <>
          <Descriptions
            size='small'
            column={{ xs: 1, sm: 2 }}
            style={{ marginBottom: 16 }}
            items={[
              { key: 'employee', label: 'Employee', children: ot.employee ? `${ot.employee.employee_code} - ${ot.employee.full_name}` : '—' },
              { key: 'status', label: 'Status', children: <><Tag color={TIME_ENTRY_STATUS_COLORS[ot.status]}>{ot.status}</Tag><PaidTag paidIn={ot.paid_in} pendingIn={ot.pending_in} /></> },
              { key: 'branch', label: 'Branch / Position', children: [ot.employee?.branch?.name, ot.employee?.position?.name].filter(Boolean).join(' / ') || '—' },
              { key: 'date', label: 'Date', children: formatDate(ot.date) },
              { key: 'time', label: 'Overtime', children: timeRange(ot.time_from, ot.time_to) },
              { key: 'hours', label: 'Hours', children: <strong>{hoursText(ot.hours)}</strong> },
            ]}
          />
          <Typography.Title level={5}>Details</Typography.Title>
          <Descriptions
            size='small'
            bordered
            column={1}
            styles={{ label: { width: 180 } }}
            items={[
              {
                key: 'day',
                label: 'Day (when filed)',
                children: (
                  <>
                    <Tag color={DAY_TYPE_COLORS[ot.day_type]}>{ot.day_type}</Tag>
                    {data.day?.day_type !== ot.day_type && (
                      <Typography.Text type='warning'>Now counts as {data.day?.day_type} (schedule / holidays changed)</Typography.Text>
                    )}
                  </>
                ),
              },
              { key: 'break', label: 'Break', children: ot.break_minutes > 0 ? `${ot.break_minutes} min` : '—' },
              { key: 'schedule', label: 'Schedule that day', children: scheduleText(data.schedule) },
              { key: 'biometric', label: 'Biometric', children: punchesText(data.punches) },
              { key: 'reason', label: 'Reason', children: ot.reason || '—' },
            ]}
          />
          <Typography.Title level={5} style={{ marginTop: 16 }}>Approval Route</Typography.Title>
          <ApprovalSteps approval={data.approval} chartName='Overtime' />
          <Typography.Title level={5} style={{ marginTop: 16 }}>History</Typography.Title>
          <FilingHistory record={ot} history={data.approval?.history} />
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

export default OvertimeDetailsModal;
