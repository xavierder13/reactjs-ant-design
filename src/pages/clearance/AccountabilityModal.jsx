import { useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Alert, App } from 'antd';
import clearanceApi from '../../services/clearance/clearanceApi';
import handleApiError from '../../utils/handleApiError';
import { applyLeaveErrors } from '../leave/leaveHelpers';
import { pesoInputProps, toNumber } from '../payroll/payrollHelpers';

const STATUS_HINTS = {
  Unsettled: 'Still owed — the component can\'t be signed off yet',
  Returned: 'Item returned (for an asset: record the return in its asset module too)',
  Paid: 'Settled by the employee',
  'Deduct from Final Pay': 'Becomes a deduction line on the Final Pay',
  Waived: 'Written off — nothing collected',
};

// Add (accountability = null) or edit what the employee owes a department.
// `asset` (optional, add only): an asset still assigned to the employee —
// the accountability stands for it (description and book value prefilled).
// `line` (optional, add only): a checklist line not returned — charged at
// the item's standard charge (Deduct from Final Pay when it has one); the
// line shows Charged until the accountability is removed.
const AccountabilityModal = ({ open, itemId, accountability, asset, line, statuses, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const status = Form.useWatch('status', form);

  const handleAfterOpenChange = (isOpen) => {
    form.resetFields();
    if (!isOpen) return;
    if (accountability) {
      form.setFieldsValue({
        description: accountability.description,
        amount: toNumber(accountability.amount),
        status: accountability.status,
        remarks: accountability.remarks,
      });
    } else if (asset) {
      form.setFieldsValue({
        description: `${asset.asset_tag} — ${asset.description}`.slice(0, 255),
        amount: asset.book_value !== null && asset.book_value !== undefined ? Number(asset.book_value) : null,
        status: 'Unsettled',
      });
    } else if (line) {
      form.setFieldsValue({
        description: `Not returned: ${line.item}`.slice(0, 255),
        amount: line.standard_charge ?? null,
        status: line.standard_charge ? 'Deduct from Final Pay' : 'Unsettled',
      });
    } else {
      form.setFieldsValue({ status: 'Unsettled' });
    }
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      description: values.description,
      amount: values.amount ?? 0,
      status: values.status,
      remarks: values.remarks || null,
    };
    setSaving(true);
    try {
      const { data } = accountability
        ? await clearanceApi.updateAccountability(accountability.id, payload)
        : await clearanceApi.addAccountability(itemId, {
          ...payload,
          asset_type: asset?.asset_type ?? null,
          asset_id: asset?.asset_id ?? null,
          clearance_item_id: line?.item_id ?? null,
        });
      message.success(data.message);
      onSaved(data);
    } catch (error) {
      applyLeaveErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      keyboard={false}
      open={open}
      title={accountability ? 'Edit Accountability' : 'Add Accountability'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={{ xs: '100%', sm: 560 }}
    >
      {asset && !accountability && (
        <Alert
          type='info'
          showIcon
          style={{ marginBottom: 16 }}
          title={`${asset.asset_type} ${asset.asset_tag} is still assigned to the employee`}
          description='Charge it (Deduct from Final Pay / Paid) or waive it to let the component be signed off while it stays unreturned.'
        />
      )}
      {line && !accountability && (
        <Alert
          type='info'
          showIcon
          style={{ marginBottom: 16 }}
          title={`Charging "${line.item}"`}
          description='The checklist line shows Charged; remove this accountability to answer the line again.'
        />
      )}
      <Form form={form} layout='vertical'>
        <Form.Item name='description' label='Description' rules={[{ required: true, message: 'Description is required' }]}>
          <Input maxLength={255} placeholder='e.g. Unliquidated cash advance, unreturned uniform' />
        </Form.Item>
        <Form.Item
          name='amount'
          label='Amount'
          rules={[{
            validator: (_, v) => (status === 'Deduct from Final Pay' && !(v > 0)
              ? Promise.reject(new Error('Give the amount to deduct from the final pay'))
              : Promise.resolve()),
          }]}
          dependencies={['status']}
        >
          <InputNumber {...pesoInputProps} />
        </Form.Item>
        <Form.Item name='status' label='Status' extra={STATUS_HINTS[status]} rules={[{ required: true, message: 'Status is required' }]}>
          <Select options={statuses.map((s) => ({ value: s, label: s }))} />
        </Form.Item>
        <Form.Item name='remarks' label='Remarks'>
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AccountabilityModal;
