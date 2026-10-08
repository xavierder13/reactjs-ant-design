import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Input, Select, DatePicker, Alert, Descriptions, Tag, Space, Typography, App } from 'antd';
import leaveApi from '../../services/leave/leaveApi';
import handleApiError from '../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../utils/formatDate';
import EmployeeSelect from '../manpower_request/request/EmployeeSelect';
import { applyLeaveErrors } from './leaveHelpers';

// File (leave = null) or edit a pending leave. While the employee, type,
// dates and half day are filled in, the backend previews the counted days
// (rest days from the employee's Work Schedule, holidays from the Holiday
// Calendar for their branch), the type's balance for that year, and the
// rule that would block saving — Save stays disabled until it's clear.
const LeaveFormModal = ({ open, leave, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [preview, setPreview] = useState(null);
  const [balance, setBalance] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  const employeeId = Form.useWatch('employee_id', form);
  const leaveTypeId = Form.useWatch('leave_type_id', form);
  const dates = Form.useWatch('dates', form);
  const halfDay = Form.useWatch('half_day', form);
  const oneDay = !!dates?.[0] && !!dates?.[1] && dates[0].isSame(dates[1], 'day');
  // The preview only shows while every field it depends on is filled in.
  const ready = !!(open && employeeId && leaveTypeId && dates?.[0] && dates?.[1]);

  const handleAfterOpenChange = async (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    setPreview(null);
    setBalance(null);
    if (leave) {
      form.setFieldsValue({
        employee_id: leave.employee_id,
        leave_type_id: leave.leave_type_id,
        dates: [dayjs(leave.date_from), dayjs(leave.date_to)],
        half_day: leave.half_day,
        reason: leave.reason,
      });
    }
    try {
      const { data } = await leaveApi.getCreate();
      setLeaveTypes(data.leave_types);
    } catch (error) {
      handleApiError(error, message);
    }
  };

  // Half day only applies to a one-day leave.
  useEffect(() => {
    if (!oneDay && halfDay) form.setFieldsValue({ half_day: null });
  }, [oneDay, halfDay, form]);

  // Debounced preview + the type's balance for that year.
  useEffect(() => {
    if (!ready) return undefined;
    const payload = {
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      date_from: dates[0].format('YYYY-MM-DD'),
      date_to: dates[1].format('YYYY-MM-DD'),
      half_day: oneDay ? halfDay || null : null,
      leave_id: leave?.id,
    };
    let cancelled = false;
    const timer = setTimeout(async () => {
      setPreviewing(true);
      try {
        const { data: computed } = await leaveApi.compute(payload);
        if (cancelled) return;
        setPreview(computed);
        setBalance(computed.balance || null);
      } catch (error) {
        if (!cancelled) {
          setPreview(null);
          setBalance(null);
          if (error.response?.status !== 422) handleApiError(error, message);
        }
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [ready, employeeId, leaveTypeId, dates, halfDay, oneDay, leave, message]);

  const skipped = useMemo(() => (preview?.count?.breakdown || []).filter((d) => d.skipped), [preview]);

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // AntD shows inline field errors
    }

    const payload = {
      leave_type_id: values.leave_type_id,
      date_from: values.dates[0].format('YYYY-MM-DD'),
      date_to: values.dates[1].format('YYYY-MM-DD'),
      half_day: oneDay ? values.half_day || null : null,
      reason: values.reason?.trim() || null,
    };

    setSaving(true);
    try {
      const { data } = leave
        ? await leaveApi.update(leave.id, payload)
        : await leaveApi.create({ ...payload, employee_id: values.employee_id });
      message.success(data.message);
      onSaved();
    } catch (error) {
      applyLeaveErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  const typeOptions = leaveTypes.map((t) => ({ value: t.id, label: `${t.name}${t.is_paid ? '' : ' (unpaid)'}` }));
  // Editing a leave whose type was since made inactive: keep it labelled.
  if (leave && !leaveTypes.some((t) => t.id === leave.leave_type_id) && leave.leave_type) {
    typeOptions.push({ value: leave.leave_type_id, label: `${leave.leave_type.name} (inactive)` });
  }

  return (
    <Modal
      open={open}
      title={leave ? 'Edit Leave' : 'File Leave'}
      okText='Save'
      onOk={handleSave}
      okButtonProps={{ disabled: (ready && !!preview?.error) || previewing }}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={720}
    >
      <Form form={form} layout='vertical'>
        {/* the employee of a filed leave can't change */}
        {leave ? (
          <>
            <Form.Item label='Employee'>
              <Input readOnly value={`${leave.employee?.employee_code} - ${leave.employee?.full_name}`} />
            </Form.Item>
            <Form.Item name='employee_id' hidden><Input /></Form.Item>
          </>
        ) : (
          <Form.Item name='employee_id' label='Employee' rules={[{ required: true, message: 'Employee is required' }]}>
            <EmployeeSelect activeOnly />
          </Form.Item>
        )}
        <Form.Item name='leave_type_id' label='Leave Type' rules={[{ required: true, message: 'Leave type is required' }]}>
          <Select options={typeOptions} showSearch={{ optionFilterProp: 'label' }} />
        </Form.Item>
        <Space wrap align='start' style={{ width: '100%' }}>
          <Form.Item name='dates' label='Dates' rules={[{ required: true, message: 'Dates are required' }]}>
            <DatePicker.RangePicker format={DISPLAY_DATE_FORMAT} />
          </Form.Item>
          <Form.Item name='half_day' label='Half Day' extra={oneDay ? null : 'One-day leave only.'}>
            <Select
              allowClear
              placeholder='Whole day'
              disabled={!oneDay}
              options={[{ value: 'AM', label: 'AM (morning)' }, { value: 'PM', label: 'PM (afternoon)' }]}
              style={{ width: 170 }}
            />
          </Form.Item>
        </Space>
        <Form.Item name='reason' label='Reason'>
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>

      {ready && preview && (
        <>
          {preview.error && <Alert type='error' showIcon title={preview.error} style={{ marginBottom: 12 }} />}
          {preview.count.unscheduled?.length > 0 && (
            <Alert
              type='warning'
              showIcon
              title={`No Work Schedule or shifting on ${preview.count.unscheduled.map((d) => formatDate(d)).join(', ')} — counted as working days.`}
              style={{ marginBottom: 12 }}
            />
          )}
          {preview.count.no_schedule && (
            <Alert
              type='warning'
              showIcon
              title='This employee has no Work Schedule — no rest day is skipped. Add one on the employee’s Work Schedule tab.'
              style={{ marginBottom: 12 }}
            />
          )}
          {preview.approvers && preview.approvers.length === 0 && (
            <Alert
              type='warning'
              showIcon
              title='No level-1 approver covers this employee (Access Chart "Leave Application" and position subordinates) — only an Administrator can approve level 1.'
              style={{ marginBottom: 12 }}
            />
          )}
          <Descriptions size='small' bordered column={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2, xxl: 2 }}>
            <Descriptions.Item label='Days counted'><Typography.Text strong>{preview.count.days}</Typography.Text></Descriptions.Item>
            <Descriptions.Item label='Balance'>
              {!balance || balance.credits === null
                ? 'No yearly balance'
                : `${balance.balance} of ${balance.credits} left${balance.pending ? ` (${balance.pending} pending)` : ''}`}
            </Descriptions.Item>
            <Descriptions.Item label='Approval' span='filled'>
              {preview.approvers === null
                ? 'No approval procedure set up — Leave approvers decide in one step.'
                : `Level 1: ${preview.approvers.map((a) => a.name).join(', ') || '—'}`}
            </Descriptions.Item>
            {skipped.length > 0 && (
              <Descriptions.Item label='Not counted' span='filled'>
                <Space size={[4, 4]} wrap>
                  {skipped.map((d) => (
                    <Tag key={d.date} style={{ whiteSpace: 'normal', maxWidth: '100%' }}>
                      {`${formatDate(d.date)} (${d.day}) — ${d.skipped}`}
                    </Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            )}
          </Descriptions>
        </>
      )}
    </Modal>
  );
};

export default LeaveFormModal;
