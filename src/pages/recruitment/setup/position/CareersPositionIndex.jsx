import { useMemo, useState } from 'react';
import { Table, Alert, Tag, App } from 'antd';
import useAuth from '../../../../hooks/useAuth';
import useCareersPositions from '../../../../hooks/useCareersPositions';
import careersPositionApi from '../../../../services/recruitment/careersPositionApi';
import RecordToolbar from '../../../record_management/RecordToolbar';
import RecordRowActions from '../../../record_management/RecordRowActions';
import { resultMessage, showGatewayError } from '../setupHelpers';
import CareersPositionFormModal from './CareersPositionFormModal';

// Careers portal positions — recruitment-portal position/PositionIndex.vue,
// run through the vueportal gateway as the signed-in user. These are what
// applicants apply for on the careers site (not this HRIS's positions).
const CareersPositionIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items, departments, ranks, isLoading, error, refetch } = useCareersPositions();

  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);

  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('careers-position-create');
  const canEdit   = isAdmin || hasPermission('careers-position-edit');
  const canDelete = isAdmin || hasPermission('careers-position-delete');

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase();
    return items.filter((position) => !search || (
      position.name.toLowerCase().includes(search) ||
      position.rank?.name.toLowerCase().includes(search) ||
      position.department?.name.toLowerCase().includes(search) ||
      position.department?.division?.name.toLowerCase().includes(search)
    ));
  }, [items, searchText]);

  const openCreate  = () => { setEditing(null); setModalOpen(true); };
  const openEdit    = (record) => { setEditing(record); setModalOpen(true); };
  const closeModal  = () => { setModalOpen(false); setEditing(null); };
  const handleSaved = () => { closeModal(); refetch(); };

  const handleDelete = async (id) => {
    try {
      const { data } = await careersPositionApi.delete(id);
      message.success(resultMessage(data, 'Record has been deleted'));
      refetch();
    } catch (err) {
      showGatewayError(err, message);
    }
  };

  const byText = (pick) => (a, b) => (pick(a) || '').localeCompare(pick(b) || '');

  const columns = [
    { title: 'Position', dataIndex: 'name', sorter: byText((r) => r.name) },
    { title: 'Rank', dataIndex: ['rank', 'name'], render: (v) => v || '—', sorter: byText((r) => r.rank?.name) },
    { title: 'Department', dataIndex: ['department', 'name'], render: (v) => v || '—', sorter: byText((r) => r.department?.name) },
    { title: 'Division', dataIndex: ['department', 'division', 'name'], render: (v) => v || '—', sorter: byText((r) => r.department?.division?.name) },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      filters: [{ text: 'Active', value: 1 }, { text: 'Inactive', value: 0 }],
      onFilter: (value, record) => Number(record.status) === value,
      render: (status) => (Number(status) === 1 ? <Tag color='green'>Active</Tag> : <Tag>Inactive</Tag>),
    },
    {
      title: 'Actions',
      width: 100,
      render: (_, record) => (
        <RecordRowActions
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={() => openEdit(record)}
          onDelete={() => handleDelete(record.id)}
          deleteTitle='Delete this careers position?'
          deleteDescription='Its job vacancies disappear from the careers site and lists.'
        />
      ),
    },
  ];

  return (
    <div>
      {error && <Alert type='error' showIcon title={error} style={{ marginBottom: 16 }} />}
      <RecordToolbar
        searchPlaceholder='Search position, rank, department or division'
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
      />
      <CareersPositionFormModal
        open={modalOpen}
        position={editing}
        departments={departments}
        ranks={ranks}
        onClose={closeModal}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default CareersPositionIndex;
