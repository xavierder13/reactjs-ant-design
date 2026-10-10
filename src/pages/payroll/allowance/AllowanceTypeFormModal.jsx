import { useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, Row, Col, App } from 'antd';
import allowanceTypeApi from '../../../services/payroll/allowanceTypeApi';
import handleApiError from '../../../utils/handleApiError';
import { applyFormErrors, pesoInputProps, toNumber } from '../payrollHelpers';

// Create / edit an allowance type and its tax treatment: taxable, or a de
// minimis benefit (non-taxable up to a limit per period; the excess is
// taxable). `type` = null for create.
const AllowanceTypeFormModal = ({ open, type, periods, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const deMinimis = Form.useWatch('de_minimis', form);

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    form.setFieldsValue(type
      ? { ...type, de_minimis_limit: toNumber(type.de_minimis_limit) }
      : { taxable: true, de_minimis: false, active: true });
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      taxable: values.de_minimis ? false : !!values.taxable,
      de_minimis: !!values.de_minimis,
      de_minimis_limit: values.de_minimis ? values.de_minimis_limit : null,
      de_minimis_period: values.de_minimis ? values.de_minimis_period : null,
      active: !!values.active,
      remarks: values.remarks?.trim() || null,
    };
    setSaving(true);
    try {
      const { data } = type ? await allowanceTypeApi.update(type.id, payload) : await allowanceTypeApi.create(payload);
      message.success(data.message);
      onSaved();
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
      title={type ? 'Edit Allowance Type' : 'Create Allowance Type'}
      okText='Save'
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={saving}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        <Row gutter={12}>
          <Col xs={24} sm={9}>
            <Form.Item name='code' label='Code' rules={[{ required: true, whitespace: true, message: 'Code is required' }]}>
              <Input maxLength={30} style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={15}>
            <Form.Item name='name' label='Name' rules={[{ required: true, whitespace: true, message: 'Name is required' }]}>
              <Input maxLength={255} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col xs={12} sm={8}>
            <Form.Item name='de_minimis' label='De minimis' valuePropName='checked' tooltip='A BIR de minimis benefit: non-taxable up to its limit.'>
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item name='taxable' label='Taxable' valuePropName='checked'>
              <Switch disabled={!!deMinimis} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item name='active' label='Active' valuePropName='checked'>
              <Switch />
            </Form.Item>
          </Col>
        </Row>
        {deMinimis && (
          <Row gutter={12}>
            <Col xs={14}>
              <Form.Item name='de_minimis_limit' label='Non-taxable up to' rules={[{ required: true, message: 'Give the limit' }]}>
                <InputNumber {...pesoInputProps} min={0.01} />
              </Form.Item>
            </Col>
            <Col xs={10}>
              <Form.Item name='de_minimis_period' label='per' rules={[{ required: true, message: 'Give the period' }]}>
                <Select options={(periods || []).map((p) => ({ value: p, label: p }))} />
              </Form.Item>
            </Col>
          </Row>
        )}
        <Form.Item name='remarks' label='Remarks'>
          <Input.TextArea rows={2} maxLength={1000} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AllowanceTypeFormModal;
