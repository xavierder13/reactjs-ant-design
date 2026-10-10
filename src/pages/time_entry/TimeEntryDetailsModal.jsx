import { useState } from 'react';
import { Modal, Descriptions, Tag, Input, Button, Space, Popconfirm, Typography, Spin, App } from 'antd';
import timeEntryApi from '../../services/time_entry/timeEntryApi';
import handleApiError from '../../utils/handleApiError';
import { formatDate } from '../../utils/formatDate';
import ApprovalSteps from '../../components/approval/ApprovalSteps';
import FilingHistory from '../../components/approval/FilingHistory';
import { TIME_ENTRY_STATUS_COLORS, scheduleText, timeRange, breakRange } from './timeEntryHelpers';
import PaidTag from '../../components/approval/PaidTag';
import useAuth from '../../hooks/useAuth';
import filingAccess from '../../utils/filingAccess';
import TimeComparison from './TimeComparison';

// A time entry (fetched: /time_entry/show): a summary, its details with that
// day's schedule and biometric punches beside it, its approval route and
// history (filed, each decision, cancellation), and the actions this
// user may take: Approve / Disapprove when the backend says can_approve,
// Cancel with time-entry-cancel. Remarks required to disapprove.
const TimeEntryDetailsModal = ({ entryId, onClose, onActed }) => {
  const access = filingAccess(useAuth(), 'time-entry');
  const { isAdmin } = access;
  const { message } = App.useApp();
  const [data, setData] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [acting, setActing] = useState(null);

  const handleAfterOpenChange = async (isOpen) => {
    if (!isOpen) { setData(null); return; }
    setRemarks('');
    try {
      const { data: res } = await timeEntryApi.show(entryId);
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
      const { data: res } = await timeEntryApi.act(action, entryId, remarks.trim() || null);
      message.success(res.message);
      onActed();
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setActing(null);
    }
  };

  const entry = data?.entry;
  const decidable = !!data?.approval?.can_approve;
  // paid (retro adjustment instead) or in a payroll waiting for approval: Administrator only
  const cancellable = access.canCancel(entry) && ['Pending', 'Approved'].includes(entry?.status) && (isAdmin || (!entry?.paid_in && !entry?.pending_in));

  return (
    <Modal
      keyboard={false}
      open={!!entryId}
      title='Time Entry Details'
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={{ xs: '100%', sm: '95%', md: 820 }}
      footer={(
        <Space wrap>
          <Button onClick={onClose}>Close</Button>
          {cancellable && (
            <Popconfirm title='Cancel this time entry?' onConfirm={() => act('cancel')}>
              <Button color='orange' variant='outlined' loading={acting === 'cancel'}>Cancel Entry</Button>
            </Popconfirm>
          )}
          {decidable && <Button danger loading={acting === 'disapprove'} onClick={() => act('disapprove')}>Disapprove</Button>}
          {decidable && (
            <Popconfirm title='Approve this time entry?' onConfirm={() => act('approve')}>
              <Button type='primary' loading={acting === 'approve'}>Approve</Button>
            </Popconfirm>
          )}
        </Space>
      )}
    >
      {!entry ? <Spin style={{ display: 'block', margin: '32px auto' }} /> : (
        <>
          <Descriptions
            size='small'
            column={{ xs: 1, sm: 2 }}
            style={{ marginBottom: 16 }}
            items={[
              { key: 'employee', label: 'Employee', children: entry.employee ? `${entry.employee.employee_code} - ${entry.employee.full_name}` : '—' },
              { key: 'status', label: 'Status', children: <><Tag color={TIME_ENTRY_STATUS_COLORS[entry.status]}>{entry.status}</Tag><PaidTag paidIn={entry.paid_in} pendingIn={entry.pending_in} /></> },
              { key: 'branch', label: 'Branch / Position', children: [entry.employee?.branch?.name, entry.employee?.position?.name].filter(Boolean).join(' / ') || '—' },
              { key: 'date', label: 'Date', children: formatDate(entry.date) },
              { key: 'type', label: 'Type', children: entry.entry_type },
              { key: 'time', label: 'Time Filed', children: <strong>{timeRange(entry.time_in, entry.time_out)}</strong> },
            ]}
          />
          <Typography.Title level={5}>Details</Typography.Title>
          <Descriptions
            size='small'
            bordered
            column={1}
            styles={{ label: { width: 180 } }}
            items={[
              { key: 'schedule', label: 'Schedule that day', children: scheduleText(data.schedule) },
              { key: 'break', label: 'Break Filed', children: breakRange(entry.break_out, entry.break_in) || '—' },
              { key: 'location', label: 'Location', children: entry.location || '—' },
              { key: 'reason', label: 'Reason', children: entry.reason || '—' },
            ]}
          />
          <Typography.Title level={5} style={{ marginTop: 16 }}>Filed vs Biometric</Typography.Title>
          <TimeComparison punches={data.punches} filed={entry} />
          <Typography.Title level={5} style={{ marginTop: 16 }}>Approval Route</Typography.Title>
          <ApprovalSteps approval={data.approval} chartName='Manual Time Entry' />
          <Typography.Title level={5} style={{ marginTop: 16 }}>History</Typography.Title>
          <FilingHistory record={entry} history={data.approval?.history} />
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

export default TimeEntryDetailsModal;
