import { useState } from 'react';
import { Modal, Descriptions, Tag, Input, Button, Space, Popconfirm, Typography, Spin, App } from 'antd';
import timeEntryApi from '../../services/time_entry/timeEntryApi';
import handleApiError from '../../utils/handleApiError';
import { formatDate } from '../../utils/formatDate';
import ApprovalSteps from '../../components/approval/ApprovalSteps';
import { TIME_ENTRY_STATUS_COLORS, timeRange, scheduleText, punchText } from './timeEntryHelpers';

// A time entry (fetched: /time_entry/show) with that day's schedule and
// biometric punches beside it, its approval route, and the actions this
// user may take: Approve / Disapprove when the backend says can_approve,
// Cancel with time-entry-cancel. Remarks required to disapprove.
const TimeEntryDetailsModal = ({ entryId, canCancel, onClose, onActed }) => {
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
  const cancellable = canCancel && ['Pending', 'Approved'].includes(entry?.status);

  return (
    <Modal
      open={!!entryId}
      title='Time Entry Details'
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={760}
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
          <Descriptions size='small' bordered column={1} styles={{ label: { width: 180 } }}>
            <Descriptions.Item label='Employee'>
              {entry.employee ? `${entry.employee.employee_code} - ${entry.employee.full_name}` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label='Branch / Position'>
              {[entry.employee?.branch?.name, entry.employee?.position?.name].filter(Boolean).join(' / ') || '—'}
            </Descriptions.Item>
            <Descriptions.Item label='Date'>{formatDate(entry.date)}</Descriptions.Item>
            <Descriptions.Item label='Filed time'><Typography.Text strong>{timeRange(entry.time_in, entry.time_out)}</Typography.Text></Descriptions.Item>
            <Descriptions.Item label='Schedule that day'>{scheduleText(data.schedule)}</Descriptions.Item>
            <Descriptions.Item label='Biometric punches'>{punchText(data.punches)}</Descriptions.Item>
            <Descriptions.Item label='Type'>{entry.entry_type}{entry.location ? ` — ${entry.location}` : ''}</Descriptions.Item>
            <Descriptions.Item label='Reason'>{entry.reason}</Descriptions.Item>
            <Descriptions.Item label='Status'><Tag color={TIME_ENTRY_STATUS_COLORS[entry.status]}>{entry.status}</Tag></Descriptions.Item>
            <Descriptions.Item label='Filed'>{`${formatDate(entry.created_at)} by ${entry.filer?.name || '—'}`}</Descriptions.Item>
            {entry.acted_at && (
              <Descriptions.Item label={entry.status}>
                {`${formatDate(entry.acted_at)} by ${entry.actor?.name || '—'}`}
                {entry.action_remarks && <div>{entry.action_remarks}</div>}
              </Descriptions.Item>
            )}
          </Descriptions>
          <Typography.Title level={5} style={{ marginTop: 16 }}>Approval</Typography.Title>
          <ApprovalSteps approval={data.approval} chartName='Manual Time Entry' />
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
