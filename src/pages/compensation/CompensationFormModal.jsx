import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Input, InputNumber, DatePicker, Radio, Select, Alert, App } from 'antd';
import compensationApi from '../../services/compensation/compensationApi';
import EmployeeSelect from '../manpower_request/request/EmployeeSelect';
import handleApiError from '../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../utils/formatDate';
import { applyCompensationErrors, rateLabel } from './compensationHelpers';

// Add or edit one salary version. `employee` ({ id, label }) fixes the
// employee (opened from their history); without it, pick one. `version`
// = edit. The current salary is shown for reference and its pay basis is
// the default for a new version.
const CompensationFormModal = ({ open, employee, version, options, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState(null);
  const picked = Form.useWatch('employee_id', form);
  const employeeId = employee?.id ?? picked;

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    setCurrent(null);
    if (version) {
      form.setFieldsValue({
        effective_date: dayjs(version.effective_date),
        pay_basis: version.pay_basis,
        basic_rate: Number(version.basic_rate),
        change_type: version.change_type,
        reason: version.reason,
      });
    }
  };

  // The employee's salary in force today (adding only).
  useEffect(() => {
    if (!open || version || !employeeId) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await compensationApi.history(employeeId);
        if (cancelled) return;
        const now = data.versions.find((v) => v.id === data.current_id) || null;
        setCurrent(now);
        if (now && !form.getFieldValue('pay_basis')) form.setFieldsValue({ pay_basis: now.pay_basis });
      } catch (error) {
        if (!cancelled) handleApiError(error, message);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [open, version, employeeId, form, message]);

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      effective_date: values.effective_date.format('YYYY-MM-DD'),
      pay_basis: values.pay_basis,
      basic_rate: values.basic_rate,
      change_type: values.change_type,
      reason: values.reason?.trim() || null,
    };
    setSaving(true);
    try {
      const { data } = version
        ? await compensationApi.update(version.id, payload)
        : await compensationApi.create({ ...payload, employee_id: employeeId });
      message.success(data.message);
      onSaved();
    } catch (error) {
      applyCompensationErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={version ? 'Edit Salary' : 'Add Salary Change'}
      okText='Save'
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={saving}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        {employee ? (
          <Form.Item label='Employee'>
            <Input readOnly value={employee.label} />
          </Form.Item>
        ) : (
          <Form.Item name='employee_id' label='Employee' rules={[{ required: true, message: 'Select an employee' }]}>
            <EmployeeSelect placeholder='Search employee' />
          </Form.Item>
        )}
        {current && (
          <Alert
            type='info'
            showIcon
            style={{ marginBottom: 16 }}
            title={`Current salary: ${rateLabel(current.pay_basis, current.basic_rate)} since ${dayjs(current.effective_date).format(DISPLAY_DATE_FORMAT)} (${current.change_type})`}
          />
        )}
        <Form.Item
          name='effective_date'
          label='Effective Date'
          extra='The salary applies from this date until the next change.'
          rules={[{ required: true, message: 'Effective date is required' }]}
        >
          <DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name='pay_basis' label='Pay Basis' rules={[{ required: true, message: 'Pay basis is required' }]}>
          <Radio.Group
            optionType='button'
            options={(options?.pay_bases || ['Monthly', 'Daily']).map((b) => ({ value: b, label: b === 'Daily' ? 'Daily rate' : 'Monthly rate' }))}
          />
        </Form.Item>
        <Form.Item name='basic_rate' label='Basic Rate' rules={[{ required: true, message: 'Basic rate is required' }]}>
          <InputNumber
            prefix='₱'
            min={0.01}
            precision={2}
            style={{ width: '100%' }}
            formatter={(v) => (v === undefined || v === null || v === '' ? '' : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','))}
            parser={(v) => (v ? v.replace(/,/g, '') : '')}
          />
        </Form.Item>
        <Form.Item name='change_type' label='Change Type' rules={[{ required: true, message: 'Change type is required' }]}>
          <Select options={(options?.change_types || []).map((t) => ({ value: t, label: t }))} placeholder='Select' />
        </Form.Item>
        <Form.Item name='reason' label='Reason / Reference'>
          <Input.TextArea rows={2} maxLength={1000} placeholder='e.g. memo no., KPI result' />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CompensationFormModal;
