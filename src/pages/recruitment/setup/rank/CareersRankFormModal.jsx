import { useState } from 'react';
import { Modal, Form, Input, App } from 'antd';
import careersRankApi from '../../../../services/recruitment/careersRankApi';
import saveRecord from '../../../record_management/saveRecord';
import { showGatewayError } from '../setupHelpers';

// Create/edit a careers rank. `rank` = null for create, else the list row.
// Name is required and unique (portal RankController).
const CareersRankFormModal = ({ open, rank, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

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
      request: () => (rank ? careersRankApi.update(rank.id, values) : careersRankApi.create(values)),
      form,
      message,
      onSaved,
      onError: showGatewayError,
    });
    setSaving(false);
  };

  return (
    <Modal
      keyboard={false}
      open={open}
      title={rank ? 'Edit Careers Rank' : 'Create Careers Rank'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        <Form.Item name='name' label='Rank' rules={[{ required: true, whitespace: true, message: 'Please enter rank' }]}>
          <Input maxLength={255} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CareersRankFormModal;
