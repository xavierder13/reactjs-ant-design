import { useState } from 'react';
import { Modal, Form, Input, App } from 'antd';
import rankApi from '../../../services/record_management/rankApi';
import saveRecord from '../saveRecord';

// Create/edit a rank. `rank` = null for create, else the list row.
const RankFormModal = ({ open, rank, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // Reset first on every open: the form store outlives destroyOnHidden
  // content (see UserFormModal.jsx).
  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    if (rank) form.setFieldsValue({ name: rank.name });
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
      request: () => (rank ? rankApi.update(rank.id, values) : rankApi.create(values)),
      form,
      message,
      onSaved,
    });
    setSaving(false);
  };

  return (
    <Modal
      open={open}
      title={rank ? 'Edit Rank' : 'Create Rank'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        <Form.Item name='name' label='Rank' rules={[{ required: true, whitespace: true, message: 'Rank is required' }]}>
          <Input maxLength={255} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RankFormModal;
