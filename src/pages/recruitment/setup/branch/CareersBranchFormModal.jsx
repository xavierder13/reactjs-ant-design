import { useState } from 'react';
import { Modal, Form, Input, App } from 'antd';
import careersBranchApi from '../../../../services/recruitment/careersBranchApi';
import saveRecord from '../../../record_management/saveRecord';
import { showGatewayError } from '../setupHelpers';

// Create/edit a careers branch. `branch` = null for create, else the list
// row. Both fields are required and unique (portal BranchController).
const CareersBranchFormModal = ({ open, branch, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    if (branch) form.setFieldsValue({ code: branch.code, name: branch.name });
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
      request: () => (branch ? careersBranchApi.update(branch.id, values) : careersBranchApi.create(values)),
      form,
      message,
      onSaved,
      onError: showGatewayError,
    });
    setSaving(false);
  };

  return (
    <Modal
      open={open}
      title={branch ? 'Edit Careers Branch' : 'Create Careers Branch'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        <Form.Item name='code' label='Branch Code' rules={[{ required: true, whitespace: true, message: 'Please enter branch code' }]}>
          <Input maxLength={255} />
        </Form.Item>
        <Form.Item name='name' label='Branch Name' rules={[{ required: true, whitespace: true, message: 'Please enter branch' }]}>
          <Input maxLength={255} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CareersBranchFormModal;
