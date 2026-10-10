import { useState } from 'react';
import { Modal, Form, Input, Switch, App } from 'antd';
import companyApi from '../../../services/record_management/companyApi';
import saveRecord from '../saveRecord';

// Create/edit a company. `company` = null for create, else the list row.
const CompanyFormModal = ({ open, company, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // Reset first on every open: the form store outlives destroyOnHidden
  // content (see UserFormModal.jsx).
  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    form.setFieldsValue({ name: company?.name, active: company ? company.active !== 'N' : true });
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // AntD shows inline field errors
    }

    const payload = { name: values.name, active: values.active ? 'Y' : 'N' };
    setSaving(true);
    await saveRecord({
      request: () => (company ? companyApi.update(company.id, payload) : companyApi.create(payload)),
      form,
      message,
      onSaved,
    });
    setSaving(false);
  };

  return (
    <Modal
      keyboard={false}
      open={open}
      title={company ? 'Edit Company' : 'Create Company'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        <Form.Item name='name' label='Company' rules={[{ required: true, whitespace: true, message: 'Company is required' }]}>
          <Input maxLength={255} />
        </Form.Item>
        <Form.Item name='active' label='Status' valuePropName='checked'>
          <Switch checkedChildren='Active' unCheckedChildren='Inactive' />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CompanyFormModal;
