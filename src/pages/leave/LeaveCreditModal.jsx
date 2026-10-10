import { useState } from 'react';
import { Modal, Form, InputNumber, Input, Checkbox, App } from 'antd';
import leaveApi from '../../services/leave/leaveApi';
import handleApiError from '../../utils/handleApiError';
import { num, applyLeaveErrors } from './leaveHelpers';

// Set one employee's credits for a leave type and year, or go back to the
// type's yearly default. `row` = a balances row.
const LeaveCreditModal = ({ row, employeeId, year, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const useDefault = Form.useWatch('use_default', form);
  const typeDefault = row ? num(row.leave_type.yearly_credits) : null;

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen || !row) return;
    form.resetFields();
    form.setFieldsValue({ use_default: !row.is_override, credits: row.credits, remarks: row.remarks });
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const { data } = await leaveApi.setCredits({
        employee_id: employeeId,
        leave_type_id: row.leave_type.id,
        year,
        credits: values.use_default ? null : values.credits,
        remarks: values.use_default ? null : values.remarks?.trim() || null,
      });
      message.success(data.message);
      onSaved(data.balances);
    } catch (error) {
      applyLeaveErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      keyboard={false}
      open={!!row}
      title={row ? `${row.leave_type.name} Credits — ${year}` : ''}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        <Form.Item name='use_default' valuePropName='checked'>
          <Checkbox>
            {`Use the leave type's default (${typeDefault === null ? 'no yearly balance' : `${typeDefault} days`})`}
          </Checkbox>
        </Form.Item>
        <Form.Item
          name='credits'
          label='Credits (days)'
          rules={useDefault ? [] : [{ required: true, message: 'Enter the credits' }]}
        >
          <InputNumber min={0} max={365} step={1} disabled={useDefault} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name='remarks' label='Remarks'>
          <Input.TextArea rows={2} maxLength={1000} disabled={useDefault} placeholder='e.g. carried over from last year' />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LeaveCreditModal;
