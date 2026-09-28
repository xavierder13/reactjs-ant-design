import { useMemo, useState } from 'react';
import { Table, Tag, Button, Input, Space, Popconfirm, Tooltip, Tabs, Typography, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, UserAddOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import useAreas from '../../hooks/useAreas';
import areaApi from '../../services/area/areaApi';
import handleApiError from '../../utils/handleApiError';
import AreaFormModal from './AreaFormModal';
import AssignAreasModal from './AssignAreasModal';

const { Text } = Typography;

// Chevron expand toggle instead of AntD's default plus/minus — same as
// the Branch Reports page (AcknowledgmentReportIndex.jsx).
const expandIcon = ({ expanded, onExpand, record }) => (
  <Button
    type='text'
    size='small'
    icon={expanded ? <UpOutlined /> : <DownOutlined />}
    onClick={(e) => onExpand(record, e)}
  />
);

const branchTags = (areaBranches) =>
  areaBranches.map((ab) => <Tag key={ab.branch_id}>{ab.branch?.name}</Tag>);

// Area Assignment — areas (groups of branches) and the HR head personnel
// assigned to them. Two views over the same /area/index data:
// "Areas" (one row per area, CRUD of the area + its branches) and
// "HR Heads" (one row per assigned employee, with every area/branch they
// cover — HR heads are assigned to areas here, per employee).
const AreaIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items, isLoading, refetch } = useAreas();

  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigning, setAssigning]   = useState(null);

  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('area-create');
  const canEdit   = isAdmin || hasPermission('area-edit');
  const canDelete = isAdmin || hasPermission('area-delete');

  const search = searchText.toLowerCase();

  const filteredAreas = useMemo(() => items.filter((area) => !search || (
    area.code.toLowerCase().includes(search) ||
    area.name.toLowerCase().includes(search) ||
    area.area_branches.some((ab) => ab.branch?.name.toLowerCase().includes(search)) ||
    area.hr_heads.some((h) => h.employee?.full_name.toLowerCase().includes(search))
  )), [items, search]);

  // employee_id → area ids they already head (pre-fills AssignAreasModal).
  const areaAssignments = useMemo(() => {
    const map = new Map();
    items.forEach((area) => area.hr_heads.forEach((h) => {
      map.set(h.employee_id, [...(map.get(h.employee_id) || []), area.id]);
    }));
    return map;
  }, [items]);

  // One row per assigned employee, grouping every area they cover.
  const hrHeadRows = useMemo(() => {
    const byEmployee = new Map();
    items.forEach((area) => {
      area.hr_heads.forEach((h) => {
        if (!h.employee) return;
        if (!byEmployee.has(h.employee_id)) {
          byEmployee.set(h.employee_id, { employee: h.employee, areas: [] });
        }
        byEmployee.get(h.employee_id).areas.push(area);
      });
    });
    return [...byEmployee.values()]
      .map((row) => ({
        ...row,
        key: row.employee.id,
        branchCount: row.areas.reduce((sum, a) => sum + a.area_branches.length, 0),
      }))
      .filter((row) => !search || (
        row.employee.full_name.toLowerCase().includes(search) ||
        row.employee.employee_code?.toLowerCase().includes(search) ||
        row.areas.some((a) => a.name.toLowerCase().includes(search))
      ))
      .sort((a, b) => a.employee.full_name.localeCompare(b.employee.full_name));
  }, [items, search]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (record) => { setEditing(record); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSaved = () => { closeModal(); refetch(); };

  const openAssign  = (row = null) => { setAssigning(row); setAssignOpen(true); };
  const closeAssign = () => { setAssignOpen(false); setAssigning(null); };
  const handleAssigned = () => { closeAssign(); refetch(); };

  const handleUnassign = async (employeeId) => {
    try {
      const { data } = await areaApi.assignEmployee(employeeId, []);
      message.success(data.message);
      refetch();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { data } = await areaApi.delete(id);
      message.success(data.message);
      refetch();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const areaColumns = [
    { title: 'Code', dataIndex: 'code', width: 120 },
    { title: 'Area', dataIndex: 'name' },
    {
      title: 'Branches',
      dataIndex: 'area_branches',
      render: (areaBranches) => <Tag color='blue'>{areaBranches.length}</Tag>,
      width: 100,
    },
    {
      title: 'HR Head Personnel',
      dataIndex: 'hr_heads',
      render: (hrHeads) => hrHeads.length
        ? hrHeads.map((h) => (
            <Tag key={h.employee_id} color={h.employee?.active ? 'green' : 'default'}>
              {h.employee?.full_name}{h.employee?.active ? '' : ' (Inactive)'}
            </Tag>
          ))
        : <Text type='secondary'>Unassigned</Text>,
    },
    {
      title: 'Actions',
      width: 100,
      render: (_, record) => (
        <Space>
          {canEdit && (
            <Tooltip title='Edit'>
              <Button icon={<EditOutlined />} size='small' onClick={() => openEdit(record)} />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title='Delete this area?'
              description='Its branch mapping and HR head assignments are removed too.'
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

  const hrHeadColumns = [
    { title: 'Employee Code', dataIndex: ['employee', 'employee_code'], width: 140 },
    { title: 'Name', dataIndex: ['employee', 'full_name'] },
    { title: 'Position', dataIndex: ['employee', 'position', 'name'], render: (v) => v || '—' },
    { title: 'Home Branch', dataIndex: ['employee', 'branch', 'name'], render: (v) => v || '—' },
    {
      title: 'Status',
      dataIndex: ['employee', 'active'],
      render: (active) => <Tag color={active ? 'green' : 'default'}>{active ? 'Active' : 'Inactive'}</Tag>,
      width: 100,
    },
    {
      title: 'Areas',
      dataIndex: 'areas',
      render: (areas) => areas.map((a) => <Tag key={a.id} color='purple'>{a.name}</Tag>),
    },
    { title: 'Branches Covered', dataIndex: 'branchCount', width: 140 },
    {
      title: 'Actions',
      width: 100,
      render: (_, row) => canEdit && (
        <Space>
          <Tooltip title='Edit Areas'>
            <Button icon={<EditOutlined />} size='small' onClick={() => openAssign(row)} />
          </Tooltip>
          <Popconfirm
            title='Unassign from all areas?'
            description={`${row.employee.full_name} will no longer head any area.`}
            onConfirm={() => handleUnassign(row.employee.id)}
            okButtonProps={{ danger: true }}
            okText='Unassign'
          >
            <Tooltip title='Unassign'>
              <Button icon={<DeleteOutlined />} size='small' danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Input.Search
          placeholder='Search area, branch or employee'
          allowClear
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 280 }}
        />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={refetch} loading={isLoading}>Refresh</Button>
          {canEdit && (
            <Button icon={<UserAddOutlined />} onClick={() => openAssign()} disabled={!items.length}>
              Assign Areas
            </Button>
          )}
          {canCreate && (
            <Button type='primary' icon={<PlusOutlined />} onClick={openCreate}>Create Area</Button>
          )}
        </Space>
      </Space>

      <Tabs
        items={[
          {
            key: 'areas',
            label: `Areas (${filteredAreas.length})`,
            children: (
              <Table
                rowKey='id'
                size='small'
                columns={areaColumns}
                dataSource={filteredAreas}
                loading={isLoading}
                pagination={{ pageSize: 10, showSizeChanger: true }}
                expandable={{
                  expandIcon,
                  expandedRowRender: (area) => (
                    <Space orientation='vertical' size={4}>
                      {area.description && <Text type='secondary'>{area.description}</Text>}
                      <div><Text strong>Branches: </Text>{branchTags(area.area_branches)}</div>
                    </Space>
                  ),
                }}
              />
            ),
          },
          {
            key: 'hr-heads',
            label: `HR Heads (${hrHeadRows.length})`,
            children: (
              <Table
                rowKey='key'
                size='small'
                columns={hrHeadColumns}
                dataSource={hrHeadRows}
                loading={isLoading}
                pagination={{ pageSize: 10, showSizeChanger: true }}
                expandable={{
                  expandIcon,
                  expandedRowRender: (row) => (
                    <Space orientation='vertical' size={4}>
                      {row.areas.map((a) => (
                        <div key={a.id}>
                          <Text strong>{a.name}: </Text>{branchTags(a.area_branches)}
                        </div>
                      ))}
                    </Space>
                  ),
                }}
              />
            ),
          },
        ]}
      />

      <AreaFormModal open={modalOpen} area={editing} onClose={closeModal} onSaved={handleSaved} />
      <AssignAreasModal
        open={assignOpen}
        hrHead={assigning}
        areas={items}
        areaAssignments={areaAssignments}
        onClose={closeAssign}
        onSaved={handleAssigned}
      />
    </div>
  );
};

export default AreaIndex;
