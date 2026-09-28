import { useState } from 'react';
import { Modal, Form, Select, Typography, App } from 'antd';
import areaApi from '../../services/area/areaApi';
import handleApiError from '../../utils/handleApiError';
import EmployeeSelect from '../manpower_request/request/EmployeeSelect';

// Assign an HR head to one or more areas (replace-all for that employee).
// `hrHead` = null to pick a new employee, else an HR Heads tab row
// ({ employee, areas }) whose areas are being edited.
// `areaAssignments` maps employee_id → area ids they already head, so
// picking an already-assigned employee pre-fills their current areas
// instead of silently wiping them on save.
const AssignAreasModal = ({ open, hrHead, areas, areaAssignments, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const areaOptions = areas.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }));

  // Populate only once the Modal has opened (destroyOnHidden — see
  // PermissionIndex.jsx).
  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    if (hrHead) {
      form.setFieldsValue({ area_ids: hrHead.areas.map((a) => a.id) });
    } else {
      form.resetFields();
    }
  };

  const handleEmployeeChange = (employeeId) => {
    form.setFieldsValue({ area_ids: areaAssignments.get(employeeId) || [] });
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // AntD shows inline field errors
    }

    setSaving(true);
    try {
      const employeeId = hrHead ? hrHead.employee.id : values.employee_id;
      const { data } = await areaApi.assignEmployee(employeeId, values.area_ids || []);
      message.success(data.message);
      onSaved();
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={hrHead ? 'Edit Area Assignment' : 'Assign Areas'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={560}
    >
      <Form form={form} layout='vertical'>
        {hrHead ? (
          <Form.Item label='HR Head Personnel'>
            <Typography.Text strong>
              {hrHead.employee.employee_code} - {hrHead.employee.full_name}
              {hrHead.employee.active ? '' : ' (Inactive)'}
            </Typography.Text>
          </Form.Item>
        ) : (
          <Form.Item
            name='employee_id'
            label='HR Head Personnel'
            extra='Active employees only.'
            rules={[{ required: true, message: 'Select an employee' }]}
          >
            <EmployeeSelect activeOnly placeholder='Search employee' onChange={handleEmployeeChange} />
          </Form.Item>
        )}
        <Form.Item
          name='area_ids'
          label='Areas'
          extra={hrHead ? 'Remove every area to unassign this employee.' : undefined}
          rules={hrHead ? [] : [{ required: true, type: 'array', min: 1, message: 'Select at least one area' }]}
        >
          <Select
            mode='multiple'
            placeholder='Select areas'
            options={areaOptions}
            showSearch={{ optionFilterProp: 'label' }}
            maxTagCount='responsive'
            allowClear
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssignAreasModal;
