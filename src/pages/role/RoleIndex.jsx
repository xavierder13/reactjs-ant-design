import { useMemo, useState } from 'react';
import {
  Card, Row, Col, Typography, Button,
  Table, Space, Tag, Popconfirm,
  Tooltip, Input, Form, Breadcrumb, App,
} from 'antd';
import {
  PlusOutlined, EditOutlined, EyeOutlined,
  DeleteOutlined, ReloadOutlined, SearchOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';

import roleApi from '../../services/role/roleApi';
import useRoles from '../../hooks/useRoles';
import useAuth from '../../hooks/useAuth';

// The seeded Administrator role always has id 1 — vueportal's RoleController
// forbids updating/deleting it (403), so it's read-only here too.
const ADMINISTRATOR_ROLE_ID = 1;

const RoleIndex = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { hasPermission } = useAuth();
  const { roles, refreshRoles, isLoading } = useRoles();

  const [searchForm] = Form.useForm();
  // Committed search term — updated only when Search is clicked/Enter is
  // pressed (not on every keystroke), matching the original behavior.
  // `filtered` is derived directly at render time rather than synced via
  // a useEffect+setState — `roles` changing (e.g. after refreshRoles())
  // is automatically reflected without a redundant extra render.
  const [committedSearch, setCommittedSearch] = useState('');

  const filtered = useMemo(() => {
    if (!committedSearch) return roles;
    return roles.filter((r) => r.name.toLowerCase().includes(committedSearch.toLowerCase()));
  }, [roles, committedSearch]);

  const handleSearch = () => {
    const { search } = searchForm.getFieldsValue();
    setCommittedSearch(search || '');
  };

  const handleDelete = async (record) => {
    try {
      await roleApi.remove(record.id);
      message.success('Role has been deleted.');
      refreshRoles();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to delete role.');
    }
  };

  const columns = [
    { title: 'Role', dataIndex: 'name', key: 'name' },
    {
      title: 'Permissions',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (perms) => <Tag color='blue'>{perms?.length || 0}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => {
        const isAdministrator = record.id === ADMINISTRATOR_ROLE_ID;
        return (
          <Space>
            {isAdministrator ? (
              <Tooltip title='View'>
                <Button
                  color='primary'
                  variant='outlined'
                  icon={<EyeOutlined />}
                  size='small'
                  onClick={() => navigate(`/roles/${record.id}/edit`)}
                />
              </Tooltip>
            ) : (
              hasPermission('role-edit') && (
                <Tooltip title='Edit'>
                  <Button
                    color='green'
                    variant='outlined'
                    icon={<EditOutlined />}
                    size='small'
                    onClick={() => navigate(`/roles/${record.id}/edit`)}
                  />
                </Tooltip>
              )
            )}
            {!isAdministrator && hasPermission('role-delete') && (
              <Popconfirm
                title='Delete this role?'
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
        );
      },
    },
  ];

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to='/'>Home</Link> },
          { title: 'Roles' },
        ]}
      />

      <Card
        title={
          <Row gutter={[8, 8]} align='middle'>
            <Col xs={24} md={6}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                Roles
              </Typography.Title>
            </Col>

            <Col xs={24} md={8}>
              <Form form={searchForm}>
                <Form.Item name='search' style={{ marginBottom: 0 }}>
                  <Input
                    placeholder='Search role...'
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
                <Button icon={<ReloadOutlined />} onClick={refreshRoles}>
                  Refresh
                </Button>
              </Space>
            </Col>

            {hasPermission('role-create') && (
              <Col xs={24} md={4} style={{ textAlign: 'right' }}>
                <Button
                  type='primary'
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/roles/create')}
                >
                  Add Role
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
    </>
  );
};

export default RoleIndex;
