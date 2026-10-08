import { useState } from 'react';
import { Modal, Descriptions, Tag, Input, Button, Space, Popconfirm, Typography, Spin, App } from 'antd';
import overtimeApi from '../../services/overtime/overtimeApi';
import handleApiError from '../../utils/handleApiError';
import { formatDate } from '../../utils/formatDate';
import ApprovalSteps from '../../components/approval/ApprovalSteps';
import { TIME_ENTRY_STATUS_COLORS, scheduleText, timeRange } from '../time_entry/timeEntryHelpers';
import { DAY_TYPE_COLORS, hoursText, punchesText } from './overtimeHelpers';

// An overtime (fetched: /overtime/show) with that day's schedule, biometric
// reading and classification, its approval route, and the actions this
// user may take: Approve / Disapprove when the backend says can_approve,
// Cancel with overtime-cancel. Remarks required to disapprove.
const OvertimeDetailsModal = ({ overtimeId, canCancel, onClose, onActed }) => {
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
  const cancellable = canCancel && ['Pending', 'Approved'].includes(ot?.status);

  return (
    <Modal
      open={!!overtimeId}
      title='Overtime Details'
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={{ xs: '100%', sm: '95%', md: 760 }}
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
          <Descriptions size='small' bordered column={1} styles={{ label: { width: 180 } }}>
            <Descriptions.Item label='Employee'>
              {ot.employee ? `${ot.employee.employee_code} - ${ot.employee.full_name}` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label='Branch / Position'>
              {[ot.employee?.branch?.name, ot.employee?.position?.name].filter(Boolean).join(' / ') || '—'}
            </Descriptions.Item>
            <Descriptions.Item label='Date'>{formatDate(ot.date)}</Descriptions.Item>
            <Descriptions.Item label='Overtime'>
              {timeRange(ot.time_from, ot.time_to)}
              {ot.break_minutes > 0 && ` · ${ot.break_minutes} min break`}
              {' · '}<strong>{hoursText(ot.hours)}</strong>
            </Descriptions.Item>
            <Descriptions.Item label='Day (when filed)'>
              <Tag color={DAY_TYPE_COLORS[ot.day_type]}>{ot.day_type}</Tag>
              {data.day?.day_type !== ot.day_type && (
                <Typography.Text type='warning'>Now counts as {data.day?.day_type} (schedule / holidays changed)</Typography.Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label='Schedule that day'>{scheduleText(data.schedule)}</Descriptions.Item>
            <Descriptions.Item label='Biometric'>{punchesText(data.punches)}</Descriptions.Item>
            <Descriptions.Item label='Reason'>{ot.reason}</Descriptions.Item>
            <Descriptions.Item label='Status'><Tag color={TIME_ENTRY_STATUS_COLORS[ot.status]}>{ot.status}</Tag></Descriptions.Item>
            <Descriptions.Item label='Filed'>{`${formatDate(ot.created_at)} by ${ot.filer?.name || '—'}`}</Descriptions.Item>
            {ot.acted_at && (
              <Descriptions.Item label={ot.status}>
                {`${formatDate(ot.acted_at)} by ${ot.actor?.name || '—'}`}
                {ot.action_remarks && <div>{ot.action_remarks}</div>}
              </Descriptions.Item>
            )}
          </Descriptions>
          <Typography.Title level={5} style={{ marginTop: 16 }}>Approval</Typography.Title>
          <ApprovalSteps approval={data.approval} chartName='Overtime' />
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
