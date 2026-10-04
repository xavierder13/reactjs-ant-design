import { useMemo, useState } from 'react';
import { Table, Tag, Button, Space, Typography, App } from 'antd';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import useAuth from '../../../hooks/useAuth';
import usePositionRecords from '../../../hooks/usePositionRecords';
import usePositionStore from '../../../store/positionStore';
import positionApi from '../../../services/record_management/positionApi';
import handleApiError from '../../../utils/handleApiError';
import RecordToolbar from '../RecordToolbar';
import RecordRowActions from '../RecordRowActions';
import PositionFormModal from './PositionFormModal';

const { Text } = Typography;

// Chevron expand toggle, same as AreaIndex.jsx.
const expandIcon = ({ expanded, onExpand, record }) => (
  <Button
    type='text'
    size='small'
    icon={expanded ? <UpOutlined /> : <DownOutlined />}
    onClick={(e) => onExpand(record, e)}
  />
);

const totalRequired = (position) =>
  position.required_employees.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

// Position maintenance — replaces vueportal's position/PositionIndex.vue:
// rank, cost center, department, required headcount per branch and
// subordinate positions (the hierarchy MRF approvals and employee-list
// scoping walk).
const PositionIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items, ranks, branches, departments, isLoading, refetch } = usePositionRecords();

  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);

  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('position-create');
  const canEdit   = isAdmin || hasPermission('position-edit');
  const canDelete = isAdmin || hasPermission('position-delete');

  const positionNames = useMemo(() => new Map(items.map((p) => [p.id, p.name])), [items]);

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase();
    return items.filter((position) => !search || (
      position.name.toLowerCase().includes(search) ||
      position.rank?.name.toLowerCase().includes(search) ||
      position.department?.name.toLowerCase().includes(search) ||
      position.cost_center?.toLowerCase().includes(search)
    ));
  }, [items, searchText]);

  // Other pages' position dropdowns use the cached lookup store — refetch
  // it on the next page that needs it.
  const reload = () => { refetch(); usePositionStore.setState({ isLoaded: false }); };

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (record) => { setEditing(record); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };
  const handleSaved = () => { closeModal(); reload(); };

  const handleDelete = async (id) => {
    try {
      const { data } = await positionApi.delete(id);
      message.success(data.success);
      reload();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const columns = [
    { title: 'Position', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: 'Department',
      dataIndex: ['department', 'name'],
      render: (name) => name || '—',
      sorter: (a, b) => (a.department?.name || '').localeCompare(b.department?.name || ''),
    },
    { title: 'Rank', dataIndex: ['rank', 'name'], render: (name) => name || '—' },
    { title: 'Cost Center', dataIndex: 'cost_center', render: (v) => v || '—' },
    { title: 'Required Headcount', width: 160, render: (_, record) => totalRequired(record) },
    { title: 'Subordinates', dataIndex: 'subordinates', width: 120, render: (subs) => subs.length },
    {
      title: 'Actions',
      width: 100,
      render: (_, record) => (
        <RecordRowActions
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={() => openEdit(record)}
          onDelete={() => handleDelete(record.id)}
          deleteTitle='Delete this position?'
          deleteDescription='Its branch headcounts and subordinate links are removed too. Employees in it will show no position.'
        />
      ),
    },
  ];

  return (
    <div>
      <RecordToolbar
        searchPlaceholder='Search position, rank, department or cost center'
        onSearch={setSearchText}
        onRefresh={refetch}
        loading={isLoading}
        canCreate={canCreate}
        createLabel='Create Position'
        onCreate={openCreate}
      />
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        expandable={{
          expandIcon,
          expandedRowRender: (position) => {
            const staffed = position.required_employees.filter((r) => Number(r.quantity) > 0);
            return (
              <Space orientation='vertical' size={4}>
                <div>
                  <Text strong>Subordinates: </Text>
                  {position.subordinates.length
                    ? position.subordinates.map((s) => (
                        <Tag key={s.position_sub_id}>{positionNames.get(s.position_sub_id) || `#${s.position_sub_id}`}</Tag>
                      ))
                    : <Text type='secondary'>None</Text>}
                </div>
                <div>
                  <Text strong>Required per branch: </Text>
                  {staffed.length
                    ? staffed.map((r) => <Tag key={r.branch_id}>{r.branch?.name}: {r.quantity}</Tag>)
                    : <Text type='secondary'>None</Text>}
                </div>
              </Space>
            );
          },
        }}
      />
      <PositionFormModal
        open={modalOpen}
        position={editing}
        positions={items}
        ranks={ranks}
        branches={branches}
        departments={departments}
        onClose={closeModal}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default PositionIndex;
