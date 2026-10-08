import { useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Input, InputNumber, DatePicker, Select, Row, Col, Alert, App } from 'antd';
import allowanceApi from '../../../services/payroll/allowanceApi';
import EmployeeSelect from '../../manpower_request/request/EmployeeSelect';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import { applyFormErrors, peso, pesoInputProps, toNumber } from '../payrollHelpers';

const BASIS_HINTS = {
  'Per cut-off': 'Paid in full every cut-off.',
  'Per month': 'Split across the month\'s cut-offs.',
  'Per day worked': '× the days worked in the cut-off (from the DTR).',
};

// Add or edit an employee allowance. To change an amount, end the current
// one (Effective To) and add the new one from the next day — the history
// stays. `allowance` = edit (the employee can't change).
const AllowanceFormModal = ({ open, allowance, options, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const basis = Form.useWatch('basis', form);
  const typeId = Form.useWatch('allowance_type_id', form);
  const type = (options.types || []).find((t) => t.id === typeId);

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    if (allowance) {
      form.setFieldsValue({
        allowance_type_id: allowance.allowance_type_id,
        amount: toNumber(allowance.amount),
        basis: allowance.basis,
        effective_from: dayjs(allowance.effective_from),
        effective_to: allowance.effective_to ? dayjs(allowance.effective_to) : null,
        remarks: allowance.remarks,
      });
    } else {
      form.setFieldsValue({ basis: 'Per month', effective_from: dayjs().startOf('month') });
    }
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      allowance_type_id: values.allowance_type_id,
      amount: values.amount,
      basis: values.basis,
      effective_from: values.effective_from.format('YYYY-MM-DD'),
      effective_to: values.effective_to ? values.effective_to.format('YYYY-MM-DD') : null,
      remarks: values.remarks?.trim() || null,
    };
    setSaving(true);
    try {
      const { data } = allowance
        ? await allowanceApi.update(allowance.id, payload)
        : await allowanceApi.create({ ...payload, employee_id: values.employee_id });
      message.success(data.message);
      onSaved();
    } catch (error) {
      applyFormErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  const typeOptions = (options.types || [])
    .filter((t) => t.active || t.id === allowance?.allowance_type_id)
    .map((t) => ({ value: t.id, label: `${t.name}${t.active ? '' : ' (inactive)'}` }));

  return (
    <Modal
      open={open}
      title={allowance ? 'Edit Allowance' : 'Add Allowance'}
      okText='Save'
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={saving}
      afterOpenChange={handleAfterOpenChange}
      width={{ xs: '100%', sm: '95%', md: 640 }}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        {allowance ? (
          <Form.Item label='Employee'>
            <Input readOnly value={`${allowance.employee?.employee_code} - ${allowance.employee?.full_name}`} />
          </Form.Item>
        ) : (
          <Form.Item name='employee_id' label='Employee' rules={[{ required: true, message: 'Select an employee' }]}>
            <EmployeeSelect placeholder='Search employee' activeOnly />
          </Form.Item>
        )}
        <Row gutter={12}>
          <Col xs={24} sm={14}>
            <Form.Item name='allowance_type_id' label='Allowance Type' rules={[{ required: true, message: 'Select the type' }]}>
              <Select options={typeOptions} placeholder='Select' showSearch={{ optionFilterProp: 'label' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={10}>
            <Form.Item name='amount' label='Amount' rules={[{ required: true, message: 'Amount is required' }]}>
              <InputNumber {...pesoInputProps} min={0.01} />
            </Form.Item>
          </Col>
        </Row>
        {type?.de_minimis && type.de_minimis_limit && (
          <Alert
            type='info'
            showIcon
            style={{ marginBottom: 16 }}
            title={`De minimis: non-taxable up to ${peso(type.de_minimis_limit)} / ${type.de_minimis_period?.toLowerCase()} — any excess is taxed.`}
          />
        )}
        <Form.Item name='basis' label='Basis' extra={BASIS_HINTS[basis]} rules={[{ required: true, message: 'Select the basis' }]}>
          <Select options={(options.bases || []).map((b) => ({ value: b, label: b }))} />
        </Form.Item>
        <Row gutter={12}>
          <Col xs={12}>
            <Form.Item name='effective_from' label='Effective From' rules={[{ required: true, message: 'Required' }]}>
              <DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item
              name='effective_to'
              label='Effective To'
              extra='Blank = ongoing'
              dependencies={['effective_from']}
              rules={[({ getFieldValue }) => ({
                validator: (_, v) => (v && getFieldValue('effective_from') && v.isBefore(getFieldValue('effective_from'), 'day')
                  ? Promise.reject(new Error('Before Effective From'))
                  : Promise.resolve()),
              })]}
            >
              <DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name='remarks' label='Remarks'>
          <Input.TextArea rows={2} maxLength={1000} placeholder='e.g. memo no.' />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AllowanceFormModal;
