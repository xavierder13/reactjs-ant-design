import { useState } from 'react';
import { Modal, Form, Input, Transfer, Typography, App } from 'antd';
import areaApi from '../../services/area/areaApi';
import handleApiError from '../../utils/handleApiError';

// Create/edit modal for an area: code, name, description and its branches.
// `area` = null for create, else the list row being edited (already carries
// area_branches, so no extra fetch). HR heads are assigned per employee
// from the HR Heads tab (AssignAreasModal.jsx), not here.
const AreaFormModal = ({ open, area, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [saving, setSaving] = useState(false);

  // Transfer (Available ⇄ In this Area) rather than a multi-select, which
  // grows without limit as branches are picked — same control Role's
  // permission assignment uses. A branch already mapped to a different
  // area stays listed but disabled, with its area shown; the backend
  // enforces the same one-area-per-branch rule.
  const branchItems = branches.map((b) => {
    const takenElsewhere = !!b.area_id && b.area_id !== area?.id;
    return {
      key: b.id,
      title: b.name,
      code: b.code,
      areaName: takenElsewhere ? b.area_name : null,
      disabled: takenElsewhere,
    };
  });

  // Populate only once the Modal has opened (destroyOnHidden — the Form
  // isn't mounted before that; see PermissionIndex.jsx).
  const handleAfterOpenChange = async (isOpen) => {
    if (!isOpen) return;

    if (area) {
      form.setFieldsValue({
        code:         area.code,
        name:         area.name,
        description:  area.description,
        branch_ids:   area.area_branches.map((ab) => ab.branch_id),
      });
    } else {
      form.resetFields();
    }

    setLoadingBranches(true);
    try {
      const { data } = await areaApi.getCreate();
      setBranches(data.branches);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoadingBranches(false);
    }
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
      const { data } = area
        ? await areaApi.update(area.id, values)
        : await areaApi.create(values);
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
      keyboard={false}
      open={open}
      title={area ? 'Edit Area' : 'Create Area'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={820}
    >
      <Form form={form} layout='vertical'>
        <Form.Item name='code' label='Area Code' rules={[{ required: true, message: 'Area code is required' }]}>
          <Input maxLength={50} />
        </Form.Item>
        <Form.Item name='name' label='Area Name' rules={[{ required: true, message: 'Area name is required' }]}>
          <Input maxLength={255} />
        </Form.Item>
        <Form.Item name='description' label='Description'>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item
          name='branch_ids'
          label='Branches'
          valuePropName='targetKeys'
          extra='A branch can belong to only one area.'
          rules={[{ required: true, type: 'array', min: 1, message: 'Select at least one branch' }]}
        >
          <Transfer
            dataSource={branchItems}
            titles={['Available Branches', 'In this Area']}
            showSearch
            filterOption={(input, item) =>
              `${item.title} ${item.code || ''} ${item.areaName || ''}`.toLowerCase().includes(input.toLowerCase())}
            render={(item) => (
              <span>
                {item.title}
                {item.areaName && <Typography.Text type='secondary'> — {item.areaName}</Typography.Text>}
              </span>
            )}
            locale={{ notFoundContent: loadingBranches ? 'Loading branches…' : 'No branches' }}
            styles={{ section: { width: 'calc(50% - 20px)', height: 340 } }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AreaFormModal;
