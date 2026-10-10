import { useState } from 'react';
import { Modal, Form, Input, Switch, Row, Col, App } from 'antd';
import bankApi from '../../../services/payroll/bankApi';
import handleApiError from '../../../utils/handleApiError';
import { applyFormErrors } from '../payrollHelpers';

// Create / edit a bank. The code is what the Bank Accounts import template
// uses (bank_code). `bank` = null for create.
const BankFormModal = ({ open, bank, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    form.setFieldsValue(bank || { active: true });
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      active: !!values.active,
      remarks: values.remarks?.trim() || null,
    };
    setSaving(true);
    try {
      const { data } = bank ? await bankApi.update(bank.id, payload) : await bankApi.create(payload);
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
      open={open}
      title={bank ? 'Edit Bank' : 'Create Bank'}
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
            <Form.Item
              name='code'
              label='Code'
              extra='e.g. BDO, BPI, LANDBANK'
              rules={[
                { required: true, whitespace: true, message: 'Code is required' },
                { pattern: /^[A-Za-z0-9_-]+$/, message: 'Letters, digits, - and _ only' },
              ]}
            >
              <Input maxLength={30} style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={15}>
            <Form.Item name='name' label='Name' rules={[{ required: true, whitespace: true, message: 'Name is required' }]}>
              <Input maxLength={100} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name='active' label='Active' valuePropName='checked'>
          <Switch />
        </Form.Item>
        <Form.Item name='remarks' label='Remarks'>
          <Input.TextArea rows={2} maxLength={1000} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BankFormModal;
