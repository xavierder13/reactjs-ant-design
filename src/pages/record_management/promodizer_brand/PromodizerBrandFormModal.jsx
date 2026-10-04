import { useState } from 'react';
import { Modal, Form, Input, App } from 'antd';
import promodizerBrandApi from '../../../services/record_management/promodizerBrandApi';
import saveRecord from '../saveRecord';

// Create/edit a promodizer brand. `brand` = null for create, else the list row.
const PromodizerBrandFormModal = ({ open, brand, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // Reset first on every open: the form store outlives destroyOnHidden
  // content (see UserFormModal.jsx).
  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    if (brand) form.setFieldsValue({ brand: brand.brand });
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
      request: () => (brand ? promodizerBrandApi.update(brand.id, values) : promodizerBrandApi.create(values)),
      form,
      message,
      onSaved,
    });
    setSaving(false);
  };

  return (
    <Modal
      open={open}
      title={brand ? 'Edit Promodizer Brand' : 'Create Promodizer Brand'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        <Form.Item name='brand' label='Brand' rules={[{ required: true, whitespace: true, message: 'Brand is required' }]}>
          <Input maxLength={255} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PromodizerBrandFormModal;
