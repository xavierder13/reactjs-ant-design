import { useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, Row, Col, App } from 'antd';
import leaveTypeApi from '../../../services/leave/leaveTypeApi';
import handleApiError from '../../../utils/handleApiError';
import { num, applyLeaveErrors } from '../leaveHelpers';

// Create/edit a leave type. `leaveType` = null for create, else the row.
// Blank Yearly Credits = no yearly balance (per-filing limit only, or
// unlimited like Leave Without Pay).
const LeaveTypeFormModal = ({ open, leaveType, employmentTypes, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    form.setFieldsValue(leaveType ? {
      ...leaveType,
      yearly_credits: num(leaveType.yearly_credits),
      max_days_per_filing: num(leaveType.max_days_per_filing),
      employment_types: leaveType.employment_types ? leaveType.employment_types.split(',') : [],
    } : {
      is_paid: true, counts_calendar_days: false, active: true, min_service_months: 0, employment_types: [],
    });
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // AntD shows inline field errors
    }

    const payload = {
      ...values,
      code: values.code.trim(),
      name: values.name.trim(),
      gender: values.gender || null,
      yearly_credits: values.yearly_credits ?? null,
      max_days_per_filing: values.max_days_per_filing ?? null,
    };

    setSaving(true);
    try {
      const { data } = leaveType ? await leaveTypeApi.update(leaveType.id, payload) : await leaveTypeApi.create(payload);
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
      open={open}
      title={leaveType ? 'Edit Leave Type' : 'Create Leave Type'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={720}
    >
      <Form form={form} layout='vertical'>
        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item name='code' label='Code' rules={[{ required: true, whitespace: true, message: 'Code is required' }]}>
              <Input maxLength={20} style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={18}>
            <Form.Item name='name' label='Name' rules={[{ required: true, whitespace: true, message: 'Name is required' }]}>
              <Input maxLength={255} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name='yearly_credits' label='Yearly Credits' extra='Blank = no yearly balance.'>
              <InputNumber min={0} max={365} step={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name='max_days_per_filing' label='Max Days per Filing' extra='Blank = no limit.'>
              <InputNumber min={0.5} max={365} step={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name='min_service_months' label='Min. Months of Service' rules={[{ required: true, message: 'Required' }]}>
              <InputNumber min={0} max={600} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name='gender' label='Gender'>
              <Select allowClear placeholder='Any' options={[{ value: 'FEMALE', label: 'Female' }, { value: 'MALE', label: 'Male' }]} />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item name='employment_types' label='Employment Types' extra='None selected = every employment type.'>
              <Select mode='multiple' placeholder='Any' options={employmentTypes.map((t) => ({ value: t, label: t }))} />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item name='is_paid' label='Paid' valuePropName='checked'><Switch /></Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item
              name='counts_calendar_days'
              label='Count Calendar Days'
              valuePropName='checked'
              tooltip='On: every day in the range counts (e.g. maternity leave). Off: rest days from the work schedule and holidays are skipped.'
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item name='active' label='Active' valuePropName='checked'><Switch /></Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name='description' label='Description / Legal Basis'>
              <Input.TextArea rows={2} maxLength={2000} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default LeaveTypeFormModal;
