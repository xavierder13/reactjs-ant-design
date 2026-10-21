import { useState } from 'react';
import { Modal, Form, Input, InputNumber, Switch, Row, Col, App } from 'antd';
import biometricDeviceApi from '../../services/biometric_device/biometricDeviceApi';
import handleApiError from '../../utils/handleApiError';
import { applyFormErrors } from '../payroll/payrollHelpers';

// Add / edit a biometric device. The comm key is never sent back: blank on
// edit keeps the saved one, blank on add is 0 (the factory default the
// branch devices use). `device` = null for add.
const BiometricDeviceFormModal = ({ open, device, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleAfterOpenChange = (isOpen) => {
    form.resetFields();
    if (!isOpen) return;
    form.setFieldsValue(device ? { ...device, comm_key: null } : { port: 4370, active: true });
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      branch: values.branch.trim(),
      ip: values.ip.trim(),
      port: values.port,
      comm_key: values.comm_key ?? null,
      active: !!values.active,
      remarks: values.remarks?.trim() || null,
    };
    setSaving(true);
    try {
      const { data } = device ? await biometricDeviceApi.update(device.id, payload) : await biometricDeviceApi.create(payload);
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
      title={device ? 'Edit Biometric Device' : 'Add Biometric Device'}
      okText='Save'
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={saving}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        <Form.Item name='branch' label='Branch / Location' rules={[{ required: true, whitespace: true, message: 'Branch is required' }]}>
          <Input maxLength={100} />
        </Form.Item>
        <Row gutter={12}>
          <Col xs={24} sm={14}>
            <Form.Item
              name='ip'
              label='IP Address'
              extra='e.g. 192.168.12.57'
              rules={[
                { required: true, whitespace: true, message: 'IP address is required' },
                { pattern: /^[A-Za-z0-9.-]+$/, message: 'An IP address or host name' },
              ]}
            >
              <Input maxLength={100} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={10}>
            <Form.Item name='port' label='Port' rules={[{ required: true, message: 'Port is required' }]}>
              <InputNumber min={1} max={65535} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col xs={24} sm={14}>
            <Form.Item
              name='comm_key'
              label='Communication Key'
              extra={device ? 'Leave blank to keep the saved key' : 'Leave blank for 0 (factory default)'}
            >
              <InputNumber min={0} max={999999} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={10}>
            <Form.Item name='active' label='Active' valuePropName='checked'>
              <Switch />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name='remarks' label='Remarks'>
          <Input.TextArea rows={2} maxLength={1000} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BiometricDeviceFormModal;
