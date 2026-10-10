import { useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, Button, Space, Alert, Typography, App } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import accessChartApi from '../../services/approval/accessChartApi';
import saveRecord from '../record_management/saveRecord';
import { isSystemChart, levelsOf, approversAt } from './approvalHelpers';

// Create / edit an approval procedure: name, the module it's for, and its
// levels in order with the approvals each needs. Approvers are assigned per
// level on the list (expand) or on Approving Officers. A module finds its
// chart by name, so a system chart's name is read-only.
const AccessChartFormModal = ({ open, chart, modules, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const levels = Form.useWatch('levels', form) || [];

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    form.setFieldsValue(chart ? {
      name: chart.name,
      access_for: chart.access_for,
      levels: levelsOf(chart).map((l) => ({ id: l.id, num_of_approvers: l.num_of_approvers })),
    } : { levels: [{ num_of_approvers: 1 }] });
  };

  // Levels being removed that still have approvers mapped.
  const droppedWithApprovers = chart
    ? levelsOf(chart).filter((l) => l.level > levels.length && approversAt(chart, l.level).length)
    : [];

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      name: values.name.trim(),
      access_for: values.access_for,
      max_approval_level: values.levels.length,
      approver_per_level: values.levels.map((l, i) => ({ id: l.id, level: i + 1, num_of_approvers: l.num_of_approvers })),
    };
    setSaving(true);
    await saveRecord({
      request: () => (chart ? accessChartApi.update(chart.id, payload) : accessChartApi.create(payload)),
      form,
      message,
      onSaved,
    });
    setSaving(false);
  };

  return (
    <Modal
      keyboard={false}
      open={open}
      title={chart ? 'Edit Access Chart' : 'Create Access Chart'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={600}
    >
      <Form form={form} layout='vertical'>
        <Form.Item
          name='name'
          label='Name'
          extra={isSystemChart(chart) ? 'Used by an HRIS module by this name — it cannot be renamed.' : null}
          rules={[{ required: true, whitespace: true, message: 'Please enter name' }]}
        >
          <Input maxLength={255} readOnly={isSystemChart(chart)} />
        </Form.Item>
        <Form.Item name='access_for' label='Module' rules={[{ required: true, message: 'Module is required' }]}>
          <Select options={modules.map((m) => ({ value: m.id, label: m.name }))} showSearch={{ optionFilterProp: 'label' }} />
        </Form.Item>
        <Typography.Text strong>Levels (in order)</Typography.Text>
        <Form.List name='levels'>
          {(fields, { add, remove }) => (
            <div style={{ marginTop: 8 }}>
              {fields.map((field, i) => (
                <Space key={field.key} align='baseline' style={{ display: 'flex' }}>
                  <Typography.Text style={{ width: 70, display: 'inline-block' }}>{`Level ${i + 1}`}</Typography.Text>
                  <Form.Item name={[field.name, 'id']} hidden><Input /></Form.Item>
                  <Form.Item
                    name={[field.name, 'num_of_approvers']}
                    rules={[{ required: true, message: 'Required' }]}
                    style={{ marginBottom: 8 }}
                  >
                    <InputNumber min={1} max={20} precision={0} suffix='approval(s) needed' style={{ width: 210 }} />
                  </Form.Item>
                  {i === fields.length - 1 && fields.length > 1 && (
                    <MinusCircleOutlined onClick={() => remove(field.name)} title='Remove the last level' />
                  )}
                </Space>
              ))}
              <Button type='dashed' icon={<PlusOutlined />} onClick={() => add({ num_of_approvers: 1 })} disabled={fields.length >= 10}>
                Add level
              </Button>
            </div>
          )}
        </Form.List>
      </Form>
      {droppedWithApprovers.length > 0 && (
        <Alert
          type='warning'
          showIcon
          style={{ marginTop: 12 }}
          title={`Level ${droppedWithApprovers.map((l) => l.level).join(', ')} still has approvers — they stay listed but can't act once the level is removed. Remove them first if they shouldn't approve.`}
        />
      )}
    </Modal>
  );
};

export default AccessChartFormModal;
