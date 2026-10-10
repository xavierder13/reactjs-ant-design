import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Input, InputNumber, DatePicker, TimePicker, Alert, Descriptions, Tag, Row, Col, App } from 'antd';
import overtimeApi from '../../services/overtime/overtimeApi';
import handleApiError from '../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../utils/formatDate';
import EmployeeSelect from '../manpower_request/request/EmployeeSelect';
import useAuth from '../../hooks/useAuth';
import filingAccess from '../../utils/filingAccess';
import { applyLeaveErrors } from '../leave/leaveHelpers';
import { scheduleText, hhmm } from '../time_entry/timeEntryHelpers';
import { DAY_TYPE_COLORS, hoursText, punchesText } from './overtimeHelpers';

const toTime = (t) => (t ? dayjs(`2000-01-01 ${hhmm(t)}`) : null);

// File (overtime = null) or edit a pending overtime — before the day
// (pre-approval) or after it. Once employee, date and times are set, the
// preview shows the hours, how the day counts (rest day / holiday), the
// schedule and biometric punches that day, the level-1 approver, warnings
// (inside scheduled hours, an old date) and the rule that blocks saving.
const OvertimeFormModal = ({ open, overtime, onClose, onSaved }) => {
  const auth = useAuth();
  const access = filingAccess(auth, 'overtime');
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  const employeeId = Form.useWatch('employee_id', form);
  const date = Form.useWatch('date', form);
  const timeFrom = Form.useWatch('time_from', form);
  const timeTo = Form.useWatch('time_to', form);
  const breakMinutes = Form.useWatch('break_minutes', form);
  const ready = !!(open && employeeId && date && timeFrom && timeTo);

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    setPreview(null);
    if (!overtime && access.createOwnOnly && access.ownEmployeeId) form.setFieldsValue({ employee_id: access.ownEmployeeId });
    if (overtime) {
      form.setFieldsValue({
        employee_id: overtime.employee_id,
        date: dayjs(overtime.date),
        time_from: toTime(overtime.time_from),
        time_to: toTime(overtime.time_to),
        break_minutes: overtime.break_minutes,
        reason: overtime.reason,
      });
    } else {
      form.setFieldsValue({ break_minutes: 0 });
    }
  };

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setPreviewing(true);
      try {
        const { data } = await overtimeApi.preview({
          employee_id: employeeId,
          date: date.format('YYYY-MM-DD'),
          time_from: timeFrom.format('HH:mm'),
          time_to: timeTo.format('HH:mm'),
          break_minutes: breakMinutes || 0,
          reason: 'preview', // placeholder so the preview validates before it's typed
          overtime_id: overtime?.id,
        });
        if (!cancelled) setPreview(data);
      } catch (error) {
        if (!cancelled) {
          setPreview(null);
          if (error.response?.status !== 422) handleApiError(error, message);
        }
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [ready, employeeId, date, timeFrom, timeTo, breakMinutes, overtime, message]);

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      date: values.date.format('YYYY-MM-DD'),
      time_from: values.time_from.format('HH:mm'),
      time_to: values.time_to.format('HH:mm'),
      break_minutes: values.break_minutes || 0,
      reason: values.reason.trim(),
    };
    setSaving(true);
    try {
      const { data } = overtime
        ? await overtimeApi.update(overtime.id, payload)
        : await overtimeApi.create({ ...payload, employee_id: values.employee_id });
      message.success(data.message);
      onSaved();
    } catch (error) {
      applyLeaveErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      keyboard={false}
      open={open}
      title={overtime ? 'Edit Overtime' : 'File Overtime'}
      okText='Save'
      onOk={handleSave}
      okButtonProps={{ disabled: ready && (!!preview?.error || previewing) }}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={{ xs: '100%', sm: '95%', md: 720 }}
    >
      <Form form={form} layout='vertical'>
        {overtime ? (
          <>
            <Form.Item label='Employee'>
              <Input readOnly value={`${overtime.employee?.employee_code} - ${overtime.employee?.full_name}`} />
            </Form.Item>
            <Form.Item name='employee_id' hidden><Input /></Form.Item>
          </>
        ) : access.createOwnOnly ? (
          <>
            {/* files only their own (overtime-create-own) */}
            <Form.Item label='Employee'>
              <Input readOnly value={access.ownEmployeeId ? `${auth.user?.name || ''} (yourself)` : ''} />
            </Form.Item>
            {!access.ownEmployeeId && (
              <Alert type='error' showIcon style={{ marginBottom: 12 }} title='Your account is not linked to an employee record — ask HR to link it to file your own overtime.' />
            )}
            <Form.Item name='employee_id' hidden rules={[{ required: true, message: 'Your account is not linked to an employee record' }]}><Input /></Form.Item>
          </>
        ) : (
          <Form.Item name='employee_id' label='Employee' rules={[{ required: true, message: 'Employee is required' }]}>
            <EmployeeSelect activeOnly />
          </Form.Item>
        )}
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name='date' label='Date' rules={[{ required: true, message: 'Date is required' }]}>
              <DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={5}>
            <Form.Item name='time_from' label='From' rules={[{ required: true, message: 'Required' }]}>
              <TimePicker format='HH:mm' minuteStep={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={5}>
            <Form.Item name='time_to' label='To' tooltip='Earlier than From = the next day.' rules={[{ required: true, message: 'Required' }]}>
              <TimePicker format='HH:mm' minuteStep={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name='break_minutes' label='Break (minutes)' tooltip='A meal break inside the overtime — not paid.'>
              <InputNumber min={0} max={600} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name='reason' label='Reason' rules={[{ required: true, whitespace: true, message: 'Reason is required' }]}>
          <Input.TextArea rows={2} maxLength={2000} placeholder='The work that needs the overtime' />
        </Form.Item>
      </Form>

      {ready && preview && (
        <>
          {preview.error && <Alert type='error' showIcon title={preview.error} style={{ marginBottom: 12 }} />}
          {preview.warnings?.map((w) => <Alert key={w} type='warning' showIcon title={w} style={{ marginBottom: 12 }} />)}
          {preview.approvers && preview.approvers.length === 0 && (
            <Alert
              type='warning'
              showIcon
              title='No level-1 approver covers this employee (Access Chart "Overtime") — only an Administrator can approve level 1.'
              style={{ marginBottom: 12 }}
            />
          )}
          <Descriptions size='small' bordered column={1} styles={{ label: { width: 170 } }}>
            <Descriptions.Item label='Overtime'>
              <strong>{hoursText(preview.hours)}</strong>
            </Descriptions.Item>
            <Descriptions.Item label='Day'>
              <Tag color={DAY_TYPE_COLORS[preview.day?.day_type]}>{preview.day?.day_type}</Tag>
              {preview.day?.holidays?.map((h) => h.title).join(', ')}
            </Descriptions.Item>
            <Descriptions.Item label='Schedule'>{scheduleText(preview.schedule)}</Descriptions.Item>
            <Descriptions.Item label='Biometric'>{punchesText(preview.punches)}</Descriptions.Item>
            <Descriptions.Item label='Approval'>
              {preview.approvers === null
                ? 'No approval procedure set up — overtime approvers decide in one step.'
                : `Level 1: ${preview.approvers.map((a) => a.name).join(', ') || '—'}`}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}
    </Modal>
  );
};

export default OvertimeFormModal;
