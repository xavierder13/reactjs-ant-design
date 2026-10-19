import { useState } from 'react';
import { Modal, Form, Input, Alert, App } from 'antd';
import companyAssetApi from '../../services/company_asset/companyAssetApi';
import handleApiError from '../../utils/handleApiError';
import { applyLeaveErrors } from '../leave/leaveHelpers';

// Formal disposal / write-off: unassigns the asset and locks it (no more
// edits, assignments or maintenance; it can still be deleted).
const AssetDisposeModal = ({ asset, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    let v;
    try {
      v = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const { data } = await companyAssetApi.dispose(asset.id, { disposal_reason: v.disposal_reason, approved_by_name: v.approved_by_name || null });
      message.success('Asset has been disposed.');
      onSaved(data.company_asset);
    } catch (error) {
      applyLeaveErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      keyboard={false}
      open={!!asset}
      title={asset ? `Dispose ${asset.asset_tag}` : ''}
      okText='Dispose'
      okButtonProps={{ danger: true }}
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={() => form.resetFields()}
      destroyOnHidden
      width={{ xs: '100%', sm: 520 }}
    >
      <Alert type='warning' showIcon style={{ marginBottom: 16 }} title='A disposed asset is unassigned and can no longer be edited, assigned or maintained.' />
      <Form form={form} layout='vertical'>
        <Form.Item name='disposal_reason' label='Reason' rules={[{ required: true, whitespace: true, message: 'A reason for disposal is required.' }]}>
          <Input.TextArea rows={3} maxLength={1000} placeholder='e.g. Beyond repair, sold, lost' />
        </Form.Item>
        <Form.Item name='approved_by_name' label='Approved By' extra='Name of who approved the disposal (note only).'>
          <Input maxLength={255} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssetDisposeModal;
