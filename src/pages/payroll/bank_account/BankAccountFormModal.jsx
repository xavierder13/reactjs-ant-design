import { useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Input, DatePicker, Select, Row, Col, App } from 'antd';
import bankAccountApi from '../../../services/payroll/bankAccountApi';
import EmployeeSelect from '../../manpower_request/request/EmployeeSelect';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import { applyFormErrors } from '../payrollHelpers';

// Add or edit an employee's payroll bank account. A new account (the
// employee changed banks) = add one from its effective date — the earlier
// one stays as history and is still used for earlier pay dates. `account`
// = edit (the employee can't change); `forEmployee` ({ value, label }) =
// add for that employee (from the "Without account" list).
const BankAccountFormModal = ({ open, account, forEmployee, options, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    if (account) {
      form.setFieldsValue({
        bank_id: account.bank_id,
        account_name: account.account_name,
        account_no: account.account_no,
        effective_from: dayjs(account.effective_from),
        remarks: account.remarks,
      });
    } else {
      form.setFieldsValue({ employee_id: forEmployee?.value, effective_from: dayjs() });
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
      bank_id: values.bank_id,
      account_name: values.account_name.trim(),
      account_no: values.account_no.trim(),
      effective_from: values.effective_from.format('YYYY-MM-DD'),
      remarks: values.remarks?.trim() || null,
    };
    setSaving(true);
    try {
      const { data } = account
        ? await bankAccountApi.update(account.id, payload)
        : await bankAccountApi.create({ ...payload, employee_id: values.employee_id });
      message.success(data.message);
      onSaved();
    } catch (error) {
      applyFormErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  const bankOptions = (options.banks || [])
    .filter((b) => b.active || b.id === account?.bank_id)
    .map((b) => ({ value: b.id, label: `${b.name} (${b.code})${b.active ? '' : ' — inactive'}` }));

  return (
    <Modal
      open={open}
      title={account ? 'Edit Bank Account' : 'Add Bank Account'}
      okText='Save'
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={saving}
      afterOpenChange={handleAfterOpenChange}
      width={{ xs: '100%', sm: '95%', md: 600 }}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        {account ? (
          <Form.Item label='Employee'>
            <Input readOnly value={`${account.employee?.employee_code} - ${account.employee?.full_name}`} />
          </Form.Item>
        ) : (
          <Form.Item name='employee_id' label='Employee' rules={[{ required: true, message: 'Select an employee' }]}>
            <EmployeeSelect placeholder='Search employee' initialOption={forEmployee || undefined} />
          </Form.Item>
        )}
        <Form.Item name='bank_id' label='Bank' rules={[{ required: true, message: 'Select the bank' }]} extra='Missing a bank? Payroll → Setup → Banks.'>
          <Select options={bankOptions} placeholder='Select' showSearch={{ optionFilterProp: 'label' }} />
        </Form.Item>
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item
              name='account_no'
              label='Account No.'
              rules={[
                { required: true, whitespace: true, message: 'Account No. is required' },
                { pattern: /^[0-9][0-9 -]*$/, message: 'Digits, spaces and dashes only' },
              ]}
            >
              <Input maxLength={50} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name='effective_from' label='Effective From' rules={[{ required: true, message: 'Required' }]} extra='Used for pay dates from this day'>
              <DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name='account_name' label='Account Name' rules={[{ required: true, whitespace: true, message: 'Account Name is required' }]} extra='As it appears on the bank record'>
          <Input maxLength={150} />
        </Form.Item>
        <Form.Item name='remarks' label='Remarks'>
          <Input.TextArea rows={2} maxLength={1000} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BankAccountFormModal;
