import { useState } from 'react';
import { Modal, Form, Input, Select, App } from 'antd';
import branchApi from '../../../services/record_management/branchApi';
import saveRecord from '../saveRecord';

// Create/edit a branch. `branch` = null for create, else the list row.
// `companies` comes from the same /branch/index response.
const BranchFormModal = ({ open, branch, companies, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // Reset first on every open: the form store outlives destroyOnHidden
  // content (see UserFormModal.jsx).
  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    if (branch) {
      form.setFieldsValue({
        name:       branch.name,
        code:       branch.code,
        bm_oic:     branch.bm_oic,
        company_id: branch.company_id ?? undefined,
      });
    }
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // AntD shows inline field errors
    }

    setSaving(true);
    await saveRecord({
      request: () => (branch ? branchApi.update(branch.id, values) : branchApi.create(values)),
      form,
      message,
      onSaved,
    });
    setSaving(false);
  };

  return (
    <Modal
      open={open}
      title={branch ? 'Edit Branch' : 'Create Branch'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        <Form.Item name='name' label='Branch' rules={[{ required: true, whitespace: true, message: 'Branch is required' }]}>
          <Input maxLength={255} />
        </Form.Item>
        <Form.Item name='code' label='Branch Code' rules={[{ required: true, whitespace: true, message: 'Branch code is required' }]}>
          <Input maxLength={255} />
        </Form.Item>
        <Form.Item name='bm_oic' label='BM/OIC'>
          <Input maxLength={255} />
        </Form.Item>
        <Form.Item name='company_id' label='Company' rules={[{ required: true, message: 'Company is required' }]}>
          <Select
            showSearch={{ optionFilterProp: 'label' }}
            placeholder='Select company'
            options={companies.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BranchFormModal;
