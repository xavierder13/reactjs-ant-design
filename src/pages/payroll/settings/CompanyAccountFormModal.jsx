import { useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Input, DatePicker, Select, Switch, Row, Col, App } from 'antd';
import payrollSettingApi from '../../../services/payroll/payrollSettingApi';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import { applyFormErrors } from '../payrollHelpers';

// Add / edit a company payroll account (paid from). The default for a pay
// date: the account whose Default period covers it, else the one marked
// Default — e.g. BDO marked Default, BPI with a period for November. Periods
// can't overlap. `account` = null for add.
const CompanyAccountFormModal = ({ open, account, banks, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const active = Form.useWatch('active', form);

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    form.setFieldsValue(account
      ? {
        ...account,
        default_period: account.default_from ? [dayjs(account.default_from), account.default_to ? dayjs(account.default_to) : null] : null,
      }
      : { is_default: false, active: true });
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const [from, to] = values.default_period || [];
    const payload = {
      bank_id: values.bank_id,
      account_name: values.account_name.trim(),
      account_no: values.account_no.trim(),
      is_default: !!values.is_default,
      default_from: from ? from.format('YYYY-MM-DD') : null,
      default_to: to ? to.format('YYYY-MM-DD') : null,
      active: !!values.active,
      remarks: values.remarks?.trim() || null,
    };
    setSaving(true);
    try {
      const { data } = account
        ? await payrollSettingApi.accountUpdate(account.id, payload)
        : await payrollSettingApi.accountStore(payload);
      message.success(data.message);
      onSaved();
    } catch (error) {
      applyFormErrors(error, form, message, handleApiError, (k) => (k === 'default_from' || k === 'default_to' ? 'default_period' : k));
    } finally {
      setSaving(false);
    }
  };

  const bankOptions = (banks || [])
    .filter((b) => b.active || b.id === account?.bank_id)
    .map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }));

  return (
    <Modal
      keyboard={false}
      open={open}
      title={account ? 'Edit Payroll Account' : 'Add Payroll Account'}
      okText='Save'
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={saving}
      afterOpenChange={handleAfterOpenChange}
      width={{ xs: '100%', sm: '95%', md: 620 }}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
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
            <Form.Item name='account_name' label='Account Name' rules={[{ required: true, whitespace: true, message: 'Account Name is required' }]}>
              <Input maxLength={150} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col xs={12} sm={8}>
            <Form.Item name='active' label='Active' valuePropName='checked'>
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={12} sm={16}>
            <Form.Item
              name='is_default'
              label='Default'
              valuePropName='checked'
              extra='Used when no account has a default period covering the pay date. Marking this unmarks the others.'
            >
              <Switch disabled={!active} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name='default_period'
          label='Default period (optional)'
          extra='Pay dates in this period are paid from this account, e.g. a month the company pays from this bank. Leave the end blank for "from then on".'
        >
          <DatePicker.RangePicker format={DISPLAY_DATE_FORMAT} allowEmpty={[false, true]} style={{ width: '100%' }} disabled={!active} />
        </Form.Item>
        <Form.Item name='remarks' label='Remarks'>
          <Input.TextArea rows={2} maxLength={1000} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CompanyAccountFormModal;
