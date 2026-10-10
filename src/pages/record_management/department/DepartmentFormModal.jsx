import { useState } from 'react';
import { Modal, Form, Input, Select, Switch, App } from 'antd';
import departmentApi from '../../../services/record_management/departmentApi';
import saveRecord from '../saveRecord';

// Create/edit a department. `department` = null for create, else the list
// row. `divisions` comes from the same /department/index response.
// The name field is `department`, the key the controller reads and
// reports errors under.
const DepartmentFormModal = ({ open, department, divisions, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // Reset first on every open: the form store outlives destroyOnHidden
  // content (see UserFormModal.jsx).
  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    form.setFieldsValue({
      department:  department?.name,
      division_id: department?.division_id ?? undefined,
      active:      department ? department.active !== 'N' : true,
    });
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // AntD shows inline field errors
    }

    const payload = { department: values.department, division_id: values.division_id, active: values.active ? 'Y' : 'N' };
    setSaving(true);
    await saveRecord({
      request: () => (department ? departmentApi.update(department.id, payload) : departmentApi.create(payload)),
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
      title={department ? 'Edit Department' : 'Create Department'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        <Form.Item name='department' label='Department' rules={[{ required: true, whitespace: true, message: 'Department is required' }]}>
          <Input maxLength={255} />
        </Form.Item>
        {/* Required here only — the backend's division rule never runs (see departmentApi.js). */}
        <Form.Item name='division_id' label='Division' rules={[{ required: true, message: 'Division is required' }]}>
          <Select
            showSearch={{ optionFilterProp: 'label' }}
            placeholder='Select division'
            options={divisions.map((d) => ({ label: d.name, value: d.id }))}
          />
        </Form.Item>
        <Form.Item name='active' label='Status' valuePropName='checked'>
          <Switch checkedChildren='Active' unCheckedChildren='Inactive' />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DepartmentFormModal;
