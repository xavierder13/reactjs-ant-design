import { useEffect, useState } from 'react';
import {
  Tag, Button, Space, Tooltip, Popconfirm, Modal, Form, Input, Switch, App,
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import clearanceApi from '../../../services/clearance/clearanceApi';
import handleApiError from '../../../utils/handleApiError';
import { applyLeaveErrors } from '../../leave/leaveHelpers';
import SortableTable from '../../../components/SortableTable';

// Clearance Setup → Categories: the headings checklist items are grouped
// under, in the order dragged here. An inactive category leaves its items off new
// clearances; one holding items can't be deleted.
const ClearanceCategoriesTab = ({ onChanged }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(undefined); // undefined closed, null new

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await clearanceApi.categories();
      setRows(data.categories);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchRows(); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAfterOpenChange = (isOpen) => {
    form.resetFields();
    if (!isOpen) return;
    form.setFieldsValue(editing ? { name: editing.name, active: editing.active } : { active: true });
  };

  const save = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = { name: values.name, active: !!values.active };
    setSaving(true);
    try {
      const { data } = editing ? await clearanceApi.updateCategory(editing.id, payload) : await clearanceApi.createCategory(payload);
      message.success(data.message);
      setEditing(undefined);
      fetchRows();
      onChanged();
    } catch (error) {
      applyLeaveErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  // drag a row: shown at once, then saved (reloaded on failure)
  const reorder = async (ordered) => {
    setRows(ordered);
    try {
      await clearanceApi.reorderCategories(ordered.map((r) => r.id));
      onChanged();
    } catch (error) {
      handleApiError(error, message);
      fetchRows();
    }
  };

  const remove = async (record) => {
    try {
      const { data } = await clearanceApi.deleteCategory(record.id);
      message.success(data.message);
      fetchRows();
      onChanged();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const columns = [
    { title: 'Category', dataIndex: 'name' },
    { title: 'Items', dataIndex: 'items_count', width: 90 },
    { title: 'Status', dataIndex: 'active', width: 100, render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag> },
    {
      title: 'Actions',
      width: 100,
      render: (_, r) => (
        <Space>
          <Tooltip title='Edit'>
            <Button color='green' variant='outlined' icon={<EditOutlined />} size='small' onClick={() => setEditing(r)} />
          </Tooltip>
          <Popconfirm title={`Delete ${r.name}?`} description='A category holding items can only be deactivated.' onConfirm={() => remove(r)}>
            <Tooltip title='Delete'>
              <Button danger icon={<DeleteOutlined />} size='small' />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'flex-end' }} wrap>
        <Button icon={<ReloadOutlined />} onClick={fetchRows} loading={loading}>Refresh</Button>
        <Button type='primary' icon={<PlusOutlined />} onClick={() => setEditing(null)}>Add Category</Button>
      </Space>
      <SortableTable droppableId='clearance-categories' size='small' columns={columns} dataSource={rows} loading={loading} scroll={{ x: 600 }} onReorder={reorder} />
      <Modal
        keyboard={false}
        open={editing !== undefined}
        title={editing ? `Edit ${editing.name}` : 'Add Category'}
        okText='Save'
        onOk={save}
        confirmLoading={saving}
        onCancel={() => setEditing(undefined)}
        afterOpenChange={handleAfterOpenChange}
        destroyOnHidden
        width={{ xs: '100%', sm: 480 }}
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='name' label='Category' rules={[{ required: true, whitespace: true, message: 'Category name is required' }]}>
            <Input maxLength={255} placeholder='e.g. Equipment & Property' />
          </Form.Item>
          <Form.Item name='active' label='Active' valuePropName='checked' extra='Inactive: its items are left off new clearances.'>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClearanceCategoriesTab;
