import { useState } from 'react';
import { Modal, Form, Input, Select, Switch, Row, Col, App } from 'antd';
import deductionTypeApi from '../../../services/payroll/deductionTypeApi';
import handleApiError from '../../../utils/handleApiError';
import { applyFormErrors } from '../payrollHelpers';

// Create / edit a deduction type. `type` = null for create.
const DeductionTypeFormModal = ({ open, type, categories, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    form.setFieldsValue(type ? { ...type } : { active: true });
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      category: values.category,
      needs_description: !!values.needs_description,
      active: !!values.active,
      remarks: values.remarks?.trim() || null,
    };
    setSaving(true);
    try {
      const { data } = type ? await deductionTypeApi.update(type.id, payload) : await deductionTypeApi.create(payload);
      message.success(data.message);
      onSaved();
    } catch (error) {
      applyFormErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      keyboard={false}
      open={open}
      title={type ? 'Edit Deduction Type' : 'Create Deduction Type'}
      okText='Save'
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={saving}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        <Row gutter={12}>
          <Col xs={24} sm={9}>
            <Form.Item name='code' label='Code' rules={[{ required: true, whitespace: true, message: 'Code is required' }]}>
              <Input maxLength={30} style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={15}>
            <Form.Item name='name' label='Name' rules={[{ required: true, whitespace: true, message: 'Name is required' }]}>
              <Input maxLength={255} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col xs={24} sm={15}>
            <Form.Item name='category' label='Category' rules={[{ required: true, message: 'Category is required' }]}>
              <Select options={(categories || []).map((c) => ({ value: c, label: c }))} placeholder='Select' />
            </Form.Item>
          </Col>
          <Col xs={24} sm={9}>
            <Form.Item name='active' label='Active' valuePropName='checked' extra='Inactive = no new deductions'>
              <Switch />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name='needs_description'
          label='Needs Description'
          valuePropName='checked'
          extra='For a generic type (e.g. Other Deduction): each deduction must say what it is for — shown on the payslip.'
        >
          <Switch />
        </Form.Item>
        <Form.Item name='remarks' label='Remarks'>
          <Input.TextArea rows={2} maxLength={1000} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DeductionTypeFormModal;
