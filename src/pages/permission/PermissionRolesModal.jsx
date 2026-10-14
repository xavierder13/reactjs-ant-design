import { useMemo, useState } from 'react';
import { Modal, Table, Input, Space, Tag, Typography, Button, Tooltip } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

// Which roles have one permission (Permissions → View roles): each role and
// how many user accounts hold it, plus the users given the permission
// directly (not through a role). From the permission/index row; no fetch.
// Parent mounts it with a `key` per permission so the search starts empty.
const PermissionRolesModal = ({ open, permission, onClose }) => {
  const navigate = useNavigate();
  const { hasRole, hasPermission } = useAuth();
  const canEditRole = hasRole('Administrator') || hasPermission('role-edit');
  const [search, setSearch] = useState('');
  const roles = useMemo(() => permission?.roles || [], [permission]);
  const shown = roles.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()));
  const users = roles.reduce((n, r) => n + r.users_count, 0);

  return (
    <Modal
      keyboard={false}
      open={open}
      title={`Roles with ${permission?.name || ''}`}
      onCancel={onClose}
      footer={null}
      width={{ xs: '100%', sm: '95%', md: 640 }}
    >
      <Space orientation='vertical' size={12} style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <Typography.Text type='secondary'>
            {`${roles.length} role${roles.length === 1 ? '' : 's'} · ${users} user assignment${users === 1 ? '' : 's'} through them`}
            {permission?.users_count ? ` · ${permission.users_count} user${permission.users_count === 1 ? '' : 's'} given it directly` : ''}
          </Typography.Text>
          <Input.Search allowClear placeholder='Search role' onChange={(e) => setSearch(e.target.value)} style={{ width: 220, maxWidth: '100%' }} />
        </Space>
        <Table
          rowKey='id'
          size='small'
          dataSource={shown}
          pagination={false}
          scroll={{ y: '50vh' }}
          locale={{ emptyText: roles.length ? 'No role matches the search' : 'No role has this permission' }}
          columns={[
            {
              title: 'Role',
              dataIndex: 'name',
              render: (name, r) => (
                <Space>
                  <Typography.Text strong>{name}</Typography.Text>
                  {r.id === 1 && <Tag>Read-only</Tag>}
                </Space>
              ),
            },
            {
              title: 'Users',
              dataIndex: 'users_count',
              width: 90,
              align: 'right',
              render: (v) => (v ? v : <Typography.Text type='secondary'>0</Typography.Text>),
            },
            ...(canEditRole ? [{
              title: 'Actions',
              key: 'actions',
              width: 80,
              render: (_, r) => (r.id === 1 ? null : (
                <Tooltip title='Edit role'>
                  <Button size='small' color='green' variant='outlined' icon={<EditOutlined />} onClick={() => navigate(`/roles/${r.id}/edit`)} />
                </Tooltip>
              )),
            }] : []),
          ]}
        />
      </Space>
    </Modal>
  );
};

export default PermissionRolesModal;
