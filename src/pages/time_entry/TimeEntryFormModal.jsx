import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Modal, Form, Input, Select, DatePicker, TimePicker, Alert, Descriptions, Row, Col, App,
} from 'antd';
import timeEntryApi from '../../services/time_entry/timeEntryApi';
import handleApiError from '../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../utils/formatDate';
import EmployeeSelect from '../manpower_request/request/EmployeeSelect';
import { applyLeaveErrors } from '../leave/leaveHelpers';
import { scheduleText, hhmm } from './timeEntryHelpers';
import TimeComparison from './TimeComparison';

const toTime = (t) => (t ? dayjs(`2000-01-01 ${hhmm(t)}`) : null);

// File (entry = null) or edit a pending manual time entry. Once the employee
// and date are set, the preview shows that day's schedule (Work Schedule /
// shifting) and the biometric punches actually recorded, the level-1
// approver, warnings (day off, an old date) and the rule that blocks saving.
const TimeEntryFormModal = ({ open, entry, types, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  const employeeId = Form.useWatch('employee_id', form);
  const date = Form.useWatch('date', form);
  const timeIn = Form.useWatch('time_in', form);
  const timeOut = Form.useWatch('time_out', form);
  const breakOut = Form.useWatch('break_out', form);
  const breakIn = Form.useWatch('break_in', form);
  const entryType = Form.useWatch('entry_type', form);
  const ready = !!(open && employeeId && date);

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    setPreview(null);
    if (entry) {
      form.setFieldsValue({
        employee_id: entry.employee_id,
        date: dayjs(entry.date),
        time_in: toTime(entry.time_in),
        break_out: toTime(entry.break_out),
        break_in: toTime(entry.break_in),
        time_out: toTime(entry.time_out),
        entry_type: entry.entry_type,
        location: entry.location,
        reason: entry.reason,
      });
    }
  };

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setPreviewing(true);
      try {
        const { data } = await timeEntryApi.preview({
          employee_id: employeeId,
          date: date.format('YYYY-MM-DD'),
          time_in: timeIn?.format('HH:mm') || null,
          break_out: breakOut?.format('HH:mm') || null,
          break_in: breakIn?.format('HH:mm') || null,
          time_out: timeOut?.format('HH:mm') || null,
          // placeholders so the preview validates before they're filled in
          entry_type: entryType || types[0],
          reason: 'preview',
          entry_id: entry?.id,
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
  }, [ready, employeeId, date, timeIn, timeOut, breakOut, breakIn, entryType, types, entry, message]);

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      date: values.date.format('YYYY-MM-DD'),
      time_in: values.time_in?.format('HH:mm') || null,
      break_out: values.break_out?.format('HH:mm') || null,
      break_in: values.break_in?.format('HH:mm') || null,
      time_out: values.time_out?.format('HH:mm') || null,
      entry_type: values.entry_type,
      location: values.location?.trim() || null,
      reason: values.reason.trim(),
    };
    setSaving(true);
    try {
      const { data } = entry
        ? await timeEntryApi.update(entry.id, payload)
        : await timeEntryApi.create({ ...payload, employee_id: values.employee_id });
      message.success(data.message);
      onSaved();
    } catch (error) {
      applyLeaveErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  // a break needs both ends
  const pairedWith = (other, text) => ({
    validator: (_, value) => (!value === !form.getFieldValue(other) ? Promise.resolve() : Promise.reject(new Error(text))),
  });

  const atLeastOneTime = {
    validator: () => (form.getFieldValue('time_in') || form.getFieldValue('time_out')
      ? Promise.resolve() : Promise.reject(new Error('Give the time in, the time out, or both'))),
  };

  return (
    <Modal
      open={open}
      title={entry ? 'Edit Time Entry' : 'File Time Entry'}
      okText='Save'
      onOk={handleSave}
      okButtonProps={{ disabled: ready && (!!preview?.error || previewing) }}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={720}
    >
      <Form form={form} layout='vertical'>
        {entry ? (
          <>
            <Form.Item label='Employee'>
              <Input readOnly value={`${entry.employee?.employee_code} - ${entry.employee?.full_name}`} />
            </Form.Item>
            <Form.Item name='employee_id' hidden><Input /></Form.Item>
          </>
        ) : (
          <Form.Item name='employee_id' label='Employee' rules={[{ required: true, message: 'Employee is required' }]}>
            <EmployeeSelect activeOnly />
          </Form.Item>
        )}
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name='date' label='Date' rules={[{ required: true, message: 'Date is required' }]}>
              <DatePicker format={DISPLAY_DATE_FORMAT} disabledDate={(d) => d.isAfter(dayjs(), 'day')} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={16} />
          <Col xs={12} md={6}>
            <Form.Item name='time_in' label='Time In' dependencies={['time_out']} rules={[atLeastOneTime]}>
              <TimePicker format='HH:mm' minuteStep={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item
              name='break_out'
              label='Break Out'
              tooltip='Start of the break — fill both break times or neither.'
              dependencies={['break_in']}
              rules={[pairedWith('break_in', 'Give the break out with the break in')]}
            >
              <TimePicker format='HH:mm' minuteStep={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item
              name='break_in'
              label='Break In'
              tooltip='Back from the break.'
              dependencies={['break_out']}
              rules={[pairedWith('break_out', 'Give the break in with the break out')]}
            >
              <TimePicker format='HH:mm' minuteStep={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name='time_out' label='Time Out' dependencies={['time_in']} tooltip='Earlier than the time in = the next day.'>
              <TimePicker format='HH:mm' minuteStep={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='entry_type' label='Type' rules={[{ required: true, message: 'Type is required' }]}>
              <Select options={types.map((t) => ({ value: t, label: t }))} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='location' label='Location' tooltip='Where the work was done (client, office, site).'>
              <Input maxLength={255} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name='reason' label='Reason' rules={[{ required: true, whitespace: true, message: 'Reason is required' }]}>
          <Input.TextArea rows={2} maxLength={2000} placeholder='Why the biometric device could not record it' />
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
              title='No level-1 approver covers this employee (Access Chart "Manual Time Entry") — only an Administrator can approve level 1.'
              style={{ marginBottom: 12 }}
            />
          )}
          <TimeComparison
            punches={preview.punches}
            scheduleLine={`Schedule that day — ${scheduleText(preview.schedule)}`}
            filed={{
              time_in: timeIn?.format('HH:mm'),
              break_out: breakOut?.format('HH:mm'),
              break_in: breakIn?.format('HH:mm'),
              time_out: timeOut?.format('HH:mm'),
            }}
          />
          <Descriptions size='small' bordered column={1} style={{ marginTop: 12 }}>
            <Descriptions.Item label='Approval'>
              {preview.approvers === null
                ? 'No approval procedure set up — time entry approvers decide in one step.'
                : `Level 1: ${preview.approvers.map((a) => a.name).join(', ') || '—'}`}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}
    </Modal>
  );
};

export default TimeEntryFormModal;
