import { useState } from 'react';
import { Modal, Form, Input } from 'antd';

// Asks for a required reason (cancel a deduction / retro, dismiss a retro
// suggestion, roll back a payroll); `description` is shown above it.
// onSubmit(reason) resolves when saved; a rejection keeps the dialog open
// (the caller shows the error).
const ReasonModal = ({ open, title, label = 'Reason', okText = 'Save', danger = false, description = null, onSubmit, onClose }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleOk = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values.reason.trim());
    } catch {
      // the caller already showed the error
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      okText={okText}
      okButtonProps={{ danger }}
      confirmLoading={saving}
      onOk={handleOk}
      onCancel={onClose}
      afterOpenChange={(isOpen) => { if (isOpen) form.resetFields(); }}
      destroyOnHidden
    >
      {description}
      <Form form={form} layout='vertical'>
        <Form.Item name='reason' label={label} rules={[{ required: true, whitespace: true, message: 'Reason is required' }]}>
          <Input.TextArea rows={3} maxLength={1000} autoFocus />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ReasonModal;
