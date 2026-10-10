import { useMemo, useState } from 'react';
import { Modal, Input, Collapse, Tag, Empty, Typography, Space } from 'antd';

const { Text } = Typography;

// A user's permissions grouped by role — opened by clicking the role tags in
// the User Accounts list (vueportal's "Roles" dialog on user/UserIndex.vue).
// Uses the roles/permissions already on the /user/index row; no fetch.
// Parent mounts it with a `key` per user so the search starts empty.
const RolePermissionsModal = ({ open, user, onClose }) => {
  const [search, setSearch] = useState('');

  const roles = useMemo(() => user?.roles || [], [user]);

  const uniquePermissionCount = useMemo(
    () => new Set(roles.flatMap((r) => (r.permissions || []).map((p) => p.name))).size,
    [roles],
  );

  // A role matching the search shows all its permissions; otherwise only the
  // permissions that match. Roles with nothing left are hidden.
  const visibleRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roles
      .map((role) => {
        const permissions = role.permissions || [];
        if (!q || role.name.toLowerCase().includes(q)) return { ...role, shown: permissions };
        return { ...role, shown: permissions.filter((p) => p.name.toLowerCase().includes(q)) };
      })
      .filter((role) => !q || role.name.toLowerCase().includes(q) || role.shown.length);
  }, [roles, search]);

  const items = visibleRoles.map((role) => ({
    key: role.id,
    label: (
      <Space>
        <Text strong>{role.name}</Text>
        <Tag>{(role.permissions || []).length} permissions</Tag>
      </Space>
    ),
    children: role.shown.length
      ? role.shown.map((p) => <Tag key={p.id} color='blue' style={{ marginBottom: 6 }}>{p.name}</Tag>)
      : <Text type='secondary'>This role has no permissions.</Text>,
  }));

  return (
    <Modal
      keyboard={false}
      open={open}
      title={`Roles & Permissions — ${user?.name || ''}`}
      onCancel={onClose}
      footer={null}
      width={760}
    >
      <Space orientation='vertical' size={12} style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <Text type='secondary'>
            {roles.length} role{roles.length === 1 ? '' : 's'} · {uniquePermissionCount} unique permission{uniquePermissionCount === 1 ? '' : 's'}
          </Text>
          <Input.Search
            placeholder='Search role or permission'
            allowClear
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
        </Space>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {items.length
            ? <Collapse items={items} defaultActiveKey={roles.map((r) => r.id)} />
            : <Empty description={roles.length ? 'No role or permission matches the search' : 'This user has no roles'} />}
        </div>
      </Space>
    </Modal>
  );
};

export default RolePermissionsModal;
