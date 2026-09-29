import { useMemo, useState } from 'react';
import { Table, Tag, Button, Input, Select, Space, Popconfirm, Tooltip, Typography, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import useAuth from '../../hooks/useAuth';
import useUsers from '../../hooks/useUsers';
import userApi from '../../services/user/userApi';
import handleApiError from '../../utils/handleApiError';
import UserFormModal from './UserFormModal';
import RolePermissionsModal from './RolePermissionsModal';

const { Text } = Typography;

// The Administrator account; the backend refuses to delete it and the Vue
// page never let it be edited — same here.
const ADMIN_USER_ID = 1;
const VISIBLE_ROLE_TAGS = 2;

// Login only blocks 'N'; legacy rows hold '' or '1' and are active.
const isActive = (user) => user.active !== 'N';

const formatDateTime = (value) => {
  if (!value) return <Text type='secondary'>Never</Text>;
  const date = dayjs(value);
  return date.isValid() ? date.format('MM/DD/YYYY HH:mm') : value;
};

// User Accounts — login accounts for the portal: branch, position, status
// and roles. Replaces vueportal's user/UserIndex.vue (list + dialog).
const UserIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items, roles, branches, positions, isLoading, refetch } = useUsers();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState();
  const [roleFilter, setRoleFilter] = useState();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingRoles, setViewingRoles] = useState(null);

  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('user-create');
  const canEdit   = isAdmin || hasPermission('user-edit');
  const canDelete = isAdmin || hasPermission('user-delete');

  const filteredUsers = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return items.filter((u) => {
      if (statusFilter === 'active' && !isActive(u)) return false;
      if (statusFilter === 'inactive' && isActive(u)) return false;
      if (branchFilter && u.branch_id !== branchFilter) return false;
      if (roleFilter && !u.roles.some((r) => r.name === roleFilter)) return false;
      return !search || [u.name, u.email, u.branch?.name, u.position?.name, ...u.roles.map((r) => r.name)]
        .some((v) => v && v.toLowerCase().includes(search));
    });
  }, [items, searchText, statusFilter, branchFilter, roleFilter]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (record) => { setEditing(record); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };
  const handleSaved = () => { closeModal(); refetch(); };

  const handleDelete = async (id) => {
    try {
      const { data } = await userApi.remove(id);
      message.success(data.success);
      refetch();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const columns = [
    { title: 'Full Name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name), defaultSortOrder: 'ascend' },
    { title: 'E-mail', dataIndex: 'email' },
    { title: 'Branch', dataIndex: ['branch', 'name'], render: (v) => v || '—' },
    { title: 'Position', dataIndex: ['position', 'name'], render: (v) => v || '—' },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, u) => <Tag color={isActive(u) ? 'green' : 'default'}>{isActive(u) ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      // Clicking any role tag opens the user's permissions grouped by role.
      render: (userRoles, record) => {
        if (!userRoles.length) return <Text type='secondary'>None</Text>;
        const hiddenCount = userRoles.length - VISIBLE_ROLE_TAGS;
        return (
          <Tooltip title='View permissions'>
            <span style={{ cursor: 'pointer' }} onClick={() => setViewingRoles(record)}>
              {userRoles.slice(0, VISIBLE_ROLE_TAGS).map((r) => <Tag key={r.id} color='blue'>{r.name}</Tag>)}
              {hiddenCount > 0 && <Tag>+{hiddenCount} more</Tag>}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Last Login',
      dataIndex: 'last_login',
      width: 150,
      render: formatDateTime,
      sorter: (a, b) => (a.last_login || '').localeCompare(b.last_login || ''),
    },
    {
      title: 'Actions',
      width: 90,
      render: (_, record) => record.id !== ADMIN_USER_ID && (
        <Space>
          {canEdit && (
            <Tooltip title='Edit'>
              <Button color='green' variant='outlined' icon={<EditOutlined />} size='small' onClick={() => openEdit(record)} />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title='Delete this user?'
              description={`${record.name} will no longer be able to log in.`}
              onConfirm={() => handleDelete(record.id)}
              okButtonProps={{ danger: true }}
              okText='Delete'
            >
              <Tooltip title='Delete'>
                <Button icon={<DeleteOutlined />} size='small' danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input.Search
            placeholder='Search name, e-mail, branch, position or role'
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 320 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 130 }}
            options={[
              { label: 'All Status', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
          />
          <Select
            value={branchFilter}
            onChange={setBranchFilter}
            allowClear
            placeholder='All Branches'
            style={{ width: 200 }}
            options={branches.map((b) => ({ label: b.name, value: b.id }))}
            showSearch={{ optionFilterProp: 'label' }}
          />
          <Select
            value={roleFilter}
            onChange={setRoleFilter}
            allowClear
            placeholder='All Roles'
            style={{ width: 220 }}
            options={roles.map((r) => ({ label: r.name, value: r.name }))}
            showSearch={{ optionFilterProp: 'label' }}
          />
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={refetch} loading={isLoading}>Refresh</Button>
          {canCreate && (
            <Button type='primary' icon={<PlusOutlined />} onClick={openCreate}>Create User</Button>
          )}
        </Space>
      </Space>

      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={filteredUsers}
        loading={isLoading}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} users` }}
        scroll={{ x: 'max-content' }}
      />

      <UserFormModal
        open={modalOpen}
        user={editing}
        roles={roles}
        branches={branches}
        positions={positions}
        onClose={closeModal}
        onSaved={handleSaved}
      />
      <RolePermissionsModal
        key={viewingRoles?.id ?? 'none'}
        open={!!viewingRoles}
        user={viewingRoles}
        onClose={() => setViewingRoles(null)}
      />
    </div>
  );
};

export default UserIndex;
