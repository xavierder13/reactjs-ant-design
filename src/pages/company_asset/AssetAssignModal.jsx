import { useState } from 'react';
import { Modal, Form, Input, Alert, App } from 'antd';
import companyAssetApi from '../../services/company_asset/companyAssetApi';
import handleApiError from '../../utils/handleApiError';
import { applyLeaveErrors } from '../leave/leaveHelpers';
import AssignmentFields from './AssignmentFields';
import { assignedTo, assignmentPayload } from './companyAssetHelpers';

// Assign or reassign an asset to an employee or an area (the open
// assignment is closed in the history and a new one opened).
const AssetAssignModal = ({ asset, options, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleAfterOpenChange = (isOpen) => {
    form.resetFields();
    if (isOpen) form.setFieldsValue({ assignment_type: 'Employee' });
  };

  const handleSave = async () => {
    let v;
    try {
      v = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const { data } = await companyAssetApi.assign(asset.id, { ...assignmentPayload(v), remarks: v.remarks || null });
      message.success('Asset has been assigned.');
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
      title={asset ? `${asset.assignment_type ? 'Reassign' : 'Assign'} ${asset.asset_tag}` : ''}
      okText='Assign'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={{ xs: '100%', sm: 600 }}
    >
      {asset?.assignment_type && (
        <Alert type='info' showIcon style={{ marginBottom: 16 }} title={`Now with: ${assignedTo(asset)}`} description='Assigning closes this assignment in the history.' />
      )}
      <Form form={form} layout='vertical'>
        <AssignmentFields form={form} options={options} />
        <Form.Item name='remarks' label='Remarks'>
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssetAssignModal;
