import { useState } from 'react';
import { Modal, Form, Input, InputNumber, Radio, Switch, Row, Col, Descriptions, Divider, Spin, Typography, App } from 'antd';
import contributionProfileApi from '../../../services/payroll/contributionProfileApi';
import handleApiError from '../../../utils/handleApiError';
import { applyFormErrors, pesoInputProps, toNumber } from '../payrollHelpers';

const AGENCIES = [
  { key: 'sss', label: 'SSS', number: 'sss_no' },
  { key: 'philhealth', label: 'PhilHealth', number: 'philhealth_no' },
  { key: 'pagibig', label: 'Pag-IBIG', number: 'pagibig_no' },
];
const AMOUNT_KEYS = ['sss_ee_fixed', 'sss_er_fixed', 'philhealth_ee_fixed', 'philhealth_er_fixed', 'pagibig_ee_fixed', 'pagibig_er_fixed', 'pagibig_ee_additional', 'tax_fixed'];
const MODE_OPTIONS = ['Computed', 'Fixed', 'Exempt'].map((m) => ({ value: m, label: m }));

const blankNumber = (v) => (!v || v === '-' ? <Typography.Text type='danger'>Missing</Typography.Text> : v);

// How SSS / PhilHealth / Pag-IBIG and withholding tax apply to one
// employee: Computed from the table in force, a Fixed monthly amount, or
// Exempt. The government numbers are read-only here (Employee Master Data).
const ContributionProfileModal = ({ employeeId, canEdit, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [employee, setEmployee] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAfterOpenChange = async (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    setEmployee(null);
    setLoading(true);
    try {
      const { data } = await contributionProfileApi.show(employeeId);
      setEmployee(data.employee);
      setLastSaved(data.updated_by ? `${data.updated_by}` : null);
      const values = { ...data.profile };
      AMOUNT_KEYS.forEach((k) => { values[k] = toNumber(values[k]); });
      form.setFieldsValue(values);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = { ...values, remarks: values.remarks?.trim() || null };
    AMOUNT_KEYS.forEach((k) => { payload[k] = payload[k] ?? null; });
    setSaving(true);
    try {
      const { data } = await contributionProfileApi.save(employeeId, payload);
      message.success(data.message);
      onSaved();
    } catch (error) {
      applyFormErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  const amountRule = (agencyLabel, side) => ({ required: true, message: `${agencyLabel} ${side} amount is required when Fixed` });

  return (
    <Modal
      open={!!employeeId}
      title='Contribution Profile'
      okText='Save'
      onOk={handleSave}
      okButtonProps={{ disabled: !canEdit || !employee }}
      onCancel={onClose}
      confirmLoading={saving}
      afterOpenChange={handleAfterOpenChange}
      width={{ xs: '100%', sm: '95%', md: 720 }}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        {employee && (
          <Descriptions size='small' bordered column={{ xs: 1, sm: 2 }} style={{ marginBottom: 16 }}>
            <Descriptions.Item label='Employee' span={2}>{employee.employee_code} - {employee.name}</Descriptions.Item>
            <Descriptions.Item label='SSS No.'>{blankNumber(employee.sss_no)}</Descriptions.Item>
            <Descriptions.Item label='PhilHealth No.'>{blankNumber(employee.philhealth_no)}</Descriptions.Item>
            <Descriptions.Item label='Pag-IBIG No.'>{blankNumber(employee.pagibig_no)}</Descriptions.Item>
            <Descriptions.Item label='TIN'>{blankNumber(employee.tin_no)}</Descriptions.Item>
          </Descriptions>
        )}
        <Form form={form} layout='vertical' disabled={!canEdit}>
          {AGENCIES.map((a) => (
            <div key={a.key}>
              <Divider titlePlacement='start' style={{ margin: '8px 0' }}>{a.label}</Divider>
              <Row gutter={12} align='bottom'>
                <Col xs={24} md={10}>
                  <Form.Item name={`${a.key}_mode`} label='Mode' rules={[{ required: true }]}>
                    <Radio.Group optionType='button' options={MODE_OPTIONS} />
                  </Form.Item>
                </Col>
                <Form.Item noStyle shouldUpdate={(p, c) => p[`${a.key}_mode`] !== c[`${a.key}_mode`]}>
                  {({ getFieldValue }) => (getFieldValue(`${a.key}_mode`) === 'Fixed' ? (
                    <>
                      <Col xs={12} md={7}>
                        <Form.Item name={`${a.key}_ee_fixed`} label='EE / month' rules={[amountRule(a.label, 'EE')]}>
                          <InputNumber {...pesoInputProps} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={7}>
                        <Form.Item name={`${a.key}_er_fixed`} label='ER / month' rules={[amountRule(a.label, 'ER')]}>
                          <InputNumber {...pesoInputProps} />
                        </Form.Item>
                      </Col>
                    </>
                  ) : null)}
                </Form.Item>
              </Row>
              {a.key === 'pagibig' && (
                <Form.Item noStyle shouldUpdate={(p, c) => p.pagibig_mode !== c.pagibig_mode}>
                  {({ getFieldValue }) => (getFieldValue('pagibig_mode') !== 'Exempt' ? (
                    <Form.Item
                      name='pagibig_ee_additional'
                      label='Voluntary EE top-up / month'
                      extra='Added to the employee share; not deducted from taxable income.'
                    >
                      <InputNumber {...pesoInputProps} style={{ width: 220 }} />
                    </Form.Item>
                  ) : null)}
                </Form.Item>
              )}
            </div>
          ))}

          <Divider titlePlacement='start' style={{ margin: '8px 0' }}>Withholding Tax (BIR)</Divider>
          <Row gutter={12} align='bottom'>
            <Col xs={24} md={10}>
              <Form.Item name='tax_mode' label='Mode' rules={[{ required: true }]}>
                <Radio.Group optionType='button' options={MODE_OPTIONS} />
              </Form.Item>
            </Col>
            <Form.Item noStyle shouldUpdate={(p, c) => p.tax_mode !== c.tax_mode}>
              {({ getFieldValue }) => (getFieldValue('tax_mode') === 'Fixed' ? (
                <Col xs={24} md={7}>
                  <Form.Item name='tax_fixed' label='Tax / month' rules={[{ required: true, message: 'Tax amount is required when Fixed' }]}>
                    <InputNumber {...pesoInputProps} />
                  </Form.Item>
                </Col>
              ) : null)}
            </Form.Item>
          </Row>
          <Form.Item
            name='minimum_wage_earner'
            label='Minimum Wage Earner'
            valuePropName='checked'
            extra='Exempt from withholding tax on statutory minimum wage, whatever the mode above.'
          >
            <Switch />
          </Form.Item>
          <Form.Item name='remarks' label='Remarks'>
            <Input.TextArea rows={2} maxLength={1000} />
          </Form.Item>
        </Form>
        {lastSaved && <Typography.Text type='secondary' style={{ fontSize: 12 }}>Last saved by {lastSaved}</Typography.Text>}
      </Spin>
    </Modal>
  );
};

export default ContributionProfileModal;
