import { useState } from 'react';
import { Modal, Form, Input, Row, Col, App } from 'antd';
import payrollSettingApi from '../../../services/payroll/payrollSettingApi';
import handleApiError from '../../../utils/handleApiError';
import { applyFormErrors } from '../payrollHelpers';

const FIELDS = ['registered_name', 'tin', 'rdo', 'address', 'zip', 'sss_no', 'philhealth_no', 'pagibig_no'];

// Edit one company's employer details (Payroll Settings → Employers) — the
// employer on its payslips, BIR 2316, alphalist and remittance reports.
// Registered Name blank = the company name. `employer` = the Employers row;
// onSaved(employers) gets the refreshed list.
const EmployerFormModal = ({ open, employer, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    form.setFieldsValue(Object.fromEntries(FIELDS.map((k) => [k, employer?.[k] || undefined])));
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
      const { data } = await payrollSettingApi.employerUpdate(employer.id, Object.fromEntries(FIELDS.map((k) => [k, values[k]?.trim() || null])));
      message.success(data.message);
      onSaved(data.employers);
    } catch (error) {
      applyFormErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      keyboard={false}
      open={open}
      title={`Employer — ${employer?.company_name || ''}`}
      okText='Save'
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={saving}
      afterOpenChange={handleAfterOpenChange}
      width={{ xs: '100%', sm: '95%', md: 720 }}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        <Row gutter={12}>
          <Col xs={24} md={16}>
            <Form.Item name='registered_name' label='Registered Name' extra='Blank = the company name.'>
              <Input maxLength={150} placeholder={employer?.company_name} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name='tin' label='TIN' rules={[{ pattern: /^[0-9-]*$/, message: 'Digits and dashes only (e.g. 000-123-456-000)' }]}>
              <Input maxLength={30} placeholder='000-123-456-000' />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item name='address' label='Registered Address'><Input maxLength={255} /></Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item name='zip' label='ZIP Code'><Input maxLength={10} /></Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item name='rdo' label='RDO Code'><Input maxLength={10} /></Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name='sss_no' label='SSS Employer No.'><Input maxLength={30} /></Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name='philhealth_no' label='PhilHealth Employer No.'><Input maxLength={30} /></Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name='pagibig_no' label='Pag-IBIG Employer No.'><Input maxLength={30} /></Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default EmployerFormModal;
