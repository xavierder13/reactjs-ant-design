import { useMemo, useState } from 'react';
import {
  Card, Row, Col, Typography, Button,
  Table, Space, Popconfirm, Tooltip,
  Input, Form, Breadcrumb, Modal, App,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ReloadOutlined, SearchOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';

import permissionApi from '../../services/permission/permissionApi';
import usePermissions from '../../hooks/usePermissions';
import useAuth from '../../hooks/useAuth';

const PermissionIndex = () => {
  const { message } = App.useApp();
  const { hasPermission } = useAuth();
  const {
    permissions, refreshPermissions, isLoading,
  } = usePermissions();

  const [searchForm] = Form.useForm();
  // Committed search term — updated only when Search is clicked/Enter is
  // pressed. `filtered` is derived directly at render time rather than
  // synced via a useEffect+setState (avoids a redundant extra render).
  const [committedSearch, setCommittedSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, else the permission being edited
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const filtered = useMemo(() => {
    if (!committedSearch) return permissions;
    return permissions.filter((p) => p.name.toLowerCase().includes(committedSearch.toLowerCase()));
  }, [permissions, committedSearch]);

  const handleSearch = () => {
    const { search } = searchForm.getFieldsValue();
    setCommittedSearch(search || '');
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    // Matches the vueportal reference: no round-trip to /permission/edit,
    // the already-fetched list row is used to pre-fill the form.
    setEditing(record);
    form.setFieldsValue({ name: record.name });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const handleDelete = async (record) => {
    try {
      await permissionApi.remove(record.id);
      message.success('Permission has been deleted.');
      refreshPermissions();
    } catch {
      message.error('Failed to delete permission.');
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
      // vueportal's PermissionController returns HTTP 200 on both success
      // and validation failure (e.g. duplicate name) — there is no 422 to
      // catch, `data.success` is the only reliable signal.
      const { data } = editing
        ? await permissionApi.update(editing.id, values)
        : await permissionApi.create(values);

      if (data.success) {
        message.success(data.success);
        closeModal();
        refreshPermissions();
      } else {
        const [field, fieldErrors] = Object.entries(data)[0] || ['name', ['Invalid input.']];
        form.setFields([{ name: field, errors: [].concat(fieldErrors) }]);
      }
    } catch {
      message.error('Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'Permission', dataIndex: 'name', key: 'name' },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          {hasPermission('permission-edit') && (
            <Tooltip title='Edit'>
              <Button
                color='green'
                variant='outlined'
                icon={<EditOutlined />}
                size='small'
                onClick={() => openEdit(record)}
              />
            </Tooltip>
          )}
          {hasPermission('permission-delete') && (
            <Popconfirm
              title='Delete this permission?'
              description="You won't be able to revert this."
              onConfirm={() => handleDelete(record)}
              okButtonProps={{ danger: true }}
              okText='Delete'
            >
              <Tooltip title='Delete'>
                <Button danger icon={<DeleteOutlined />} size='small' />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to='/'>Home</Link> },
          { title: 'Permissions' },
        ]}
      />

      <Card
        title={
          <Row gutter={[8, 8]} align='middle'>
            <Col xs={24} md={6}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                Permissions
              </Typography.Title>
            </Col>

            <Col xs={24} md={8}>
              <Form form={searchForm}>
                <Form.Item name='search' style={{ marginBottom: 0 }}>
                  <Input
                    placeholder='Search permission...'
                    prefix={<SearchOutlined />}
                    onPressEnter={handleSearch}
                  />
                </Form.Item>
              </Form>
            </Col>

            <Col xs={24} md={6}>
              <Space wrap>
                <Button
                  color='primary'
                  variant='outlined'
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                >
                  Search
                </Button>
                <Button icon={<ReloadOutlined />} onClick={refreshPermissions}>
                  Refresh
                </Button>
              </Space>
            </Col>

            {hasPermission('permission-create') && (
              <Col xs={24} md={4} style={{ textAlign: 'right' }}>
                <Button type='primary' icon={<PlusOutlined />} onClick={openCreate}>
                  Add Permission
                </Button>
              </Col>
            )}
          </Row>
        }
      >
        <Table
          rowKey='id'
          columns={columns}
          dataSource={filtered}
          loading={isLoading}
          size='small'
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Permission' : 'New Permission'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSave}
        confirmLoading={saving}
        okText='Save'
        destroyOnHidden
      >
        <Form form={form} layout='vertical'>
          <Form.Item
            name='name'
            label='Permission'
            rules={[{ required: true, message: 'Please enter a permission name.' }]}
          >
            <Input placeholder='e.g. role-list' />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default PermissionIndex;
