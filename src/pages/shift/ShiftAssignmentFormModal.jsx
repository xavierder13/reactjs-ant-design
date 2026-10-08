import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Input, Select, DatePicker, Alert, Table, Tag, App } from 'antd';
import shiftAssignmentApi from '../../services/shift/shiftAssignmentApi';
import handleApiError from '../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../utils/formatDate';
import EmployeeSelect from '../manpower_request/request/EmployeeSelect';
import { dayText, patternSummary, applyErrors } from './shiftHelpers';

// Assign (assignment = null) or change a temporary shifting. Takes effect
// directly (no approval). The preview lists each date's current schedule
// (Work Schedule, or another shifting) next to the new shift's hours, plus
// the rule that blocks saving and warnings (e.g. a long period). A change
// asks why — kept on the revision.
const ShiftAssignmentFormModal = ({ open, assignment, options, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  const employeeId = Form.useWatch('employee_id', form);
  const shiftId = Form.useWatch('shift_id', form);
  const dates = Form.useWatch('dates', form);
  const relievedId = Form.useWatch('relieved_employee_id', form);
  const ready = !!(open && employeeId && shiftId && dates?.[0] && dates?.[1]);
  // the edited shifting's own shift may be inactive (not in options)
  const shift = (options?.shifts || []).find((s) => s.id === shiftId)
    || (assignment && shiftId && assignment.shift_id === shiftId ? assignment.shift : undefined);

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    setPreview(null);
    if (assignment) {
      form.setFieldsValue({
        employee_id: assignment.employee_id,
        shift_id: assignment.shift_id,
        dates: [dayjs(assignment.date_from), dayjs(assignment.date_to)],
        reason: assignment.reason,
        relieved_employee_id: assignment.relieved_employee_id,
      });
    }
  };

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setPreviewing(true);
      try {
        const { data } = await shiftAssignmentApi.preview({
          employee_id: employeeId,
          shift_id: shiftId,
          date_from: dates[0].format('YYYY-MM-DD'),
          date_to: dates[1].format('YYYY-MM-DD'),
          relieved_employee_id: relievedId || null,
          assignment_id: assignment?.id,
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
  }, [ready, employeeId, shiftId, dates, relievedId, assignment, message]);

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      shift_id: values.shift_id,
      date_from: values.dates[0].format('YYYY-MM-DD'),
      date_to: values.dates[1].format('YYYY-MM-DD'),
      reason: values.reason?.trim() || null,
      relieved_employee_id: values.relieved_employee_id || null,
    };
    setSaving(true);
    try {
      const { data } = assignment
        ? await shiftAssignmentApi.update(assignment.id, { ...payload, remarks: values.remarks?.trim() || null })
        : await shiftAssignmentApi.create({ ...payload, employee_id: values.employee_id });
      message.success(data.message);
      onSaved();
    } catch (error) {
      applyErrors(error, form, message, handleApiError, (key) => (key === 'date_from' || key === 'date_to' ? 'dates' : key));
    } finally {
      setSaving(false);
    }
  };

  const employeeOptions = (options?.employees || []).map((e) => ({
    value: e.id,
    label: `${e.employee_code} - ${e.full_name} (${e.position?.name || 'No position'})`,
  }));
  const shiftOptions = (options?.shifts || []).map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }));
  if (assignment?.shift && !shiftOptions.some((o) => o.value === assignment.shift_id)) {
    shiftOptions.push({ value: assignment.shift_id, label: `${assignment.shift.code} — ${assignment.shift.name} (inactive)` });
  }

  const previewColumns = [
    { title: 'Date', dataIndex: 'date', width: 140, render: (d, r) => `${formatDate(d)} (${r.day})` },
    {
      title: 'Current',
      key: 'current',
      render: (_, r) => {
        if (!r.source) return <Tag>No schedule</Tag>;
        const from = r.source === 'shift' ? <Tag color='blue'>{r.shift_code}</Tag> : <Tag>Work Schedule</Tag>;
        return <span>{from} {dayText(r)}</span>;
      },
    },
    {
      title: 'New',
      key: 'new',
      render: (_, r) => {
        const day = shift?.days.find((d) => d.day.slice(0, 3) === r.day);
        return <span><Tag color='green'>{shift?.code}</Tag> {dayText(day)}</span>;
      },
    },
  ];

  return (
    <Modal
      open={open}
      title={assignment ? 'Change Shifting' : 'Assign Shift'}
      okText='Save'
      onOk={handleSave}
      okButtonProps={{ disabled: ready && (!!preview?.error || previewing) }}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={760}
    >
      <Form form={form} layout='vertical'>
        {assignment ? (
          <>
            <Form.Item label='Employee'>
              <Input readOnly value={`${assignment.employee?.employee_code} - ${assignment.employee?.full_name}`} />
            </Form.Item>
            <Form.Item name='employee_id' hidden><Input /></Form.Item>
          </>
        ) : (
          <Form.Item name='employee_id' label='Employee' rules={[{ required: true, message: 'Employee is required' }]}>
            {options?.all ? (
              <EmployeeSelect activeOnly />
            ) : (
              <Select
                options={employeeOptions}
                showSearch={{ optionFilterProp: 'label' }}
                placeholder={employeeOptions.length ? 'Select a subordinate' : 'No subordinates to assign'}
              />
            )}
          </Form.Item>
        )}
        <Form.Item
          name='shift_id'
          label='Shift'
          extra={shift ? patternSummary(shift.days) : null}
          rules={[{ required: true, message: 'Shift is required' }]}
        >
          <Select options={shiftOptions} showSearch={{ optionFilterProp: 'label' }} />
        </Form.Item>
        <Form.Item name='dates' label='Period' rules={[{ required: true, message: 'Period is required' }]}>
          <DatePicker.RangePicker format={DISPLAY_DATE_FORMAT} />
        </Form.Item>
        <Form.Item name='relieved_employee_id' label='Relieving (optional)' tooltip='The employee this shifting covers for.'>
          <EmployeeSelect
            placeholder='Search the employee being relieved'
            initialOption={assignment?.relieved_employee ? {
              value: assignment.relieved_employee_id,
              label: `${assignment.relieved_employee.employee_code} - ${assignment.relieved_employee.full_name}`,
            } : undefined}
          />
        </Form.Item>
        <Form.Item name='reason' label='Reason'>
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
        {assignment && (
          <Form.Item name='remarks' label='Reason for this change' rules={[{ required: true, whitespace: true, message: 'Say why the shifting changed' }]}>
            <Input maxLength={2000} />
          </Form.Item>
        )}
      </Form>

      {ready && preview && (
        <>
          {preview.error && <Alert type='error' showIcon title={preview.error} style={{ marginBottom: 12 }} />}
          {preview.warnings?.map((w) => <Alert key={w} type='warning' showIcon title={w} style={{ marginBottom: 12 }} />)}
          <Table
            rowKey='date'
            size='small'
            columns={previewColumns}
            dataSource={preview.current}
            pagination={preview.current.length > 14 ? { pageSize: 14, size: 'small' } : false}
            scroll={{ x: 520 }}
          />
        </>
      )}
    </Modal>
  );
};

export default ShiftAssignmentFormModal;
