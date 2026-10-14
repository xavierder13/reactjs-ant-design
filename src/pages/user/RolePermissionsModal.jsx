import { useMemo, useState } from 'react';
import { Modal, Input, Table, Tag, Typography, Space, Button, Segmented } from 'antd';
import { ColumnHeightOutlined, VerticalAlignMiddleOutlined } from '@ant-design/icons';
import ExpandIcon from '../../components/ExpandIcon';

const { Text } = Typography;

// "payroll-run-generate" → { module: 'payroll-run', action: 'generate' };
// an "-own" / "-all" suffix stays with its verb ("leave-cancel-own" →
// leave / cancel-own). A one-word permission is its own module.
const splitPermission = (name) => {
  const parts = name.split('-');
  const take = parts.length > 2 && ['own', 'all'].includes(parts[parts.length - 1]) ? 2 : 1;
  if (parts.length <= take) return { module: name, action: '' };
  return { module: parts.slice(0, -take).join('-'), action: parts.slice(-take).join('-') };
};

const moduleLabel = (module) => module.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// [{ module, label, permissions: [{ id, name, action }] }] sorted by label.
const groupByModule = (permissions) => {
  const groups = {};
  permissions.forEach((p) => {
    const { module, action } = splitPermission(p.name);
    (groups[module] ||= { module, label: moduleLabel(module), permissions: [] }).permissions.push({ ...p, action });
  });
  return Object.values(groups)
    .map((g) => ({ ...g, permissions: g.permissions.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// A user's permissions — opened by clicking the role tags in the User
// Accounts list (vueportal's "Roles" dialog on user/UserIndex.vue). Uses the
// roles/permissions already on the /user/index row; no fetch. Two table
// views: By role (each role expands to its permissions by module) and By
// permission (each module expands to its permissions and the roles granting
// them). The search matches a role, module or permission name and opens the
// rows it matches; Expand all / Collapse all act on the current view.
// Parent mounts it with a `key` per user so the search starts empty.
const RolePermissionsModal = ({ open, user, onClose }) => {
  const [search, setSearch] = useState('');
  const [view, setView] = useState('role');
  const roles = useMemo(() => user?.roles || [], [user]);
  const [expanded, setExpanded] = useState(() => (roles.length === 1 ? { role: [roles[0].id], permission: [] } : { role: [], permission: [] }));

  // every permission once, with the roles that grant it
  const allPermissions = useMemo(() => {
    const byName = {};
    roles.forEach((role) => (role.permissions || []).forEach((p) => {
      (byName[p.name] ||= { id: p.id, name: p.name, roles: [] }).roles.push(role.name);
    }));
    return Object.values(byName);
  }, [roles]);

  const q = search.trim().toLowerCase();
  const hit = (text) => !!q && text.toLowerCase().includes(q);

  // By role: a role matching the search keeps all its permissions; otherwise
  // only the permissions (or whole modules) that match. Empty roles hidden.
  const roleRows = useMemo(() => roles
    .map((role) => {
      const permissions = role.permissions || [];
      const shown = !q || role.name.toLowerCase().includes(q)
        ? permissions
        : permissions.filter((p) => p.name.toLowerCase().includes(q) || moduleLabel(splitPermission(p.name).module).toLowerCase().includes(q));
      return { key: role.id, name: role.name, total: permissions.length, groups: groupByModule(shown), shown: shown.length };
    })
    .filter((row) => !q || row.name.toLowerCase().includes(q) || row.shown)
    .sort((a, b) => a.name.localeCompare(b.name)), [roles, q]);

  // By permission: one row per module; a module matching the search keeps
  // all its permissions, otherwise only the ones whose name or role matches.
  const moduleRows = useMemo(() => groupByModule(allPermissions)
    .map((g) => {
      const shown = !q || g.label.toLowerCase().includes(q)
        ? g.permissions
        : g.permissions.filter((p) => p.name.toLowerCase().includes(q) || p.roles.some((r) => r.toLowerCase().includes(q)));
      return { ...g, key: g.module, shown };
    })
    .filter((g) => g.shown.length), [allPermissions, q]);

  const rows = view === 'role' ? roleRows : moduleRows;
  const allKeys = rows.map((r) => r.key);
  const expandedKeys = expanded[view];
  const setExpandedKeys = (keys) => setExpanded((prev) => ({ ...prev, [view]: keys }));

  // a new search opens every row it leaves (in both views); clearing it
  // collapses them
  const onSearch = (value) => {
    setSearch(value);
    if (!value.trim()) {
      setExpanded({ role: [], permission: [] });
      return;
    }
    const v = value.trim().toLowerCase();
    setExpanded({
      role: roles
        .filter((r) => r.name.toLowerCase().includes(v) || (r.permissions || []).some((p) => p.name.toLowerCase().includes(v) || moduleLabel(splitPermission(p.name).module).toLowerCase().includes(v)))
        .map((r) => r.id),
      permission: groupByModule(allPermissions)
        .filter((g) => g.label.toLowerCase().includes(v) || g.permissions.some((p) => p.name.toLowerCase().includes(v) || p.roles.some((r) => r.toLowerCase().includes(v))))
        .map((g) => g.module),
    });
  };

  const actionTag = (p) => (
    <Tag key={p.id} color={hit(p.name) ? 'gold' : 'blue'} title={p.name} style={{ marginBottom: 4 }}>
      {p.action || p.name}
    </Tag>
  );

  const roleColumns = [
    { title: 'Role', dataIndex: 'name', render: (name) => <Text strong style={hit(name) ? { background: '#fff1b8' } : undefined}>{name}</Text> },
    { title: 'Modules', key: 'modules', width: 90, align: 'right', render: (_, row) => row.groups.length },
    {
      title: 'Permissions',
      key: 'permissions',
      width: 110,
      align: 'right',
      render: (_, row) => (q && row.shown !== row.total ? <Text>{row.shown} <Text type='secondary'>of {row.total}</Text></Text> : row.total),
    },
  ];

  const moduleColumns = [
    { title: 'Module', dataIndex: 'label', render: (label) => <Text strong style={hit(label) ? { background: '#fff1b8' } : undefined}>{label}</Text> },
    { title: 'Actions', key: 'actions', render: (_, row) => row.shown.map(actionTag) },
  ];

  // By role, expanded: the role's permissions as Module | Actions
  const renderRole = (row) => (row.groups.length ? (
    <Table
      size='small'
      rowKey='module'
      pagination={false}
      dataSource={row.groups}
      columns={[
        { title: 'Module', dataIndex: 'label', width: '35%', render: (label) => <Text style={hit(label) ? { background: '#fff1b8' } : undefined}>{label}</Text> },
        { title: 'Actions', key: 'actions', render: (_, g) => g.permissions.map(actionTag) },
      ]}
    />
  ) : <Text type='secondary'>This role has no permissions.</Text>);

  // By permission, expanded: Permission | Granted by
  const renderModule = (row) => (
    <Table
      size='small'
      rowKey='name'
      pagination={false}
      dataSource={row.shown}
      columns={[
        { title: 'Permission', dataIndex: 'name', width: '50%', render: (name) => <Text code style={hit(name) ? { background: '#fff1b8' } : undefined}>{name}</Text> },
        { title: 'Granted by', dataIndex: 'roles', render: (granted) => granted.map((r) => <Tag key={r} color={hit(r) ? 'gold' : undefined} style={{ marginBottom: 4 }}>{r}</Tag>) },
      ]}
    />
  );

  return (
    <Modal
      keyboard={false}
      open={open}
      title={`Roles & Permissions — ${user?.name || ''}`}
      onCancel={onClose}
      footer={null}
      width={{ xs: '100%', sm: '95%', md: 900 }}
    >
      <Space orientation='vertical' size={12} style={{ width: '100%' }}>
        <Text type='secondary'>
          {plural(roles.length, 'role')} · {plural(allPermissions.length, 'unique permission')} · {plural(groupByModule(allPermissions).length, 'module')}
        </Text>
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <Space wrap>
            <Segmented
              value={view}
              onChange={setView}
              options={[{ value: 'role', label: 'By role' }, { value: 'permission', label: 'By permission' }]}
            />
            <Button
              icon={<ColumnHeightOutlined />}
              onClick={() => setExpandedKeys(allKeys)}
              disabled={!rows.length || allKeys.every((k) => expandedKeys.includes(k))}
            >
              Expand all
            </Button>
            <Button
              icon={<VerticalAlignMiddleOutlined />}
              onClick={() => setExpandedKeys([])}
              disabled={!expandedKeys.length}
            >
              Collapse all
            </Button>
          </Space>
          <Input.Search
            placeholder='Search role, module or permission'
            allowClear
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            style={{ width: 300, maxWidth: '100%' }}
          />
        </Space>
        <Table
          size='small'
          rowKey='key'
          pagination={false}
          dataSource={rows}
          columns={view === 'role' ? roleColumns : moduleColumns}
          scroll={{ y: '55vh' }}
          locale={{ emptyText: roles.length ? 'No role, module or permission matches the search' : 'This user has no roles' }}
          expandable={{
            expandedRowKeys: expandedKeys,
            onExpandedRowsChange: (keys) => setExpandedKeys([...keys]),
            expandedRowRender: view === 'role' ? renderRole : renderModule,
            rowExpandable: (row) => (view === 'role' ? true : row.shown.length > 0),
            expandIcon: (props) => <ExpandIcon {...props} />,
            expandRowByClick: true,
          }}
        />
      </Space>
    </Modal>
  );
};

export default RolePermissionsModal;
