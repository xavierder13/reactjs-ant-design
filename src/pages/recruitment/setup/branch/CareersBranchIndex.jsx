import { useMemo, useState } from 'react';
import { Table, Alert, App } from 'antd';
import useAuth from '../../../../hooks/useAuth';
import useCareersBranches from '../../../../hooks/useCareersBranches';
import careersBranchApi from '../../../../services/recruitment/careersBranchApi';
import RecordToolbar from '../../../record_management/RecordToolbar';
import RecordRowActions from '../../../record_management/RecordRowActions';
import { resultMessage, showGatewayError } from '../setupHelpers';
import CareersBranchFormModal from './CareersBranchFormModal';
import { tablePagination } from '../../../../utils/tablePagination';

// Careers portal branches — recruitment-portal branch/BranchIndex.vue, run
// through the vueportal gateway as the signed-in user. These are the
// branches applicants pick on the careers site (portal ids, not this HRIS's
// branches).
const CareersBranchIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items, isLoading, error, refetch } = useCareersBranches();

  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);

  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('careers-branch-create');
  const canEdit   = isAdmin || hasPermission('careers-branch-edit');
  const canDelete = isAdmin || hasPermission('careers-branch-delete');

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase();
    return items.filter((branch) => !search || (
      branch.name.toLowerCase().includes(search) ||
      branch.code?.toLowerCase().includes(search)
    ));
  }, [items, searchText]);

  const openCreate  = () => { setEditing(null); setModalOpen(true); };
  const openEdit    = (record) => { setEditing(record); setModalOpen(true); };
  const closeModal  = () => { setModalOpen(false); setEditing(null); };
  const handleSaved = () => { closeModal(); refetch(); };

  const handleDelete = async (id) => {
    try {
      const { data } = await careersBranchApi.delete(id);
      message.success(resultMessage(data, 'Record has been deleted'));
      refetch();
    } catch (err) {
      showGatewayError(err, message);
    }
  };

  const columns = [
    { title: 'Branch Code', dataIndex: 'code', width: 160, sorter: (a, b) => (a.code || '').localeCompare(b.code || '') },
    { title: 'Branch', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: 'Actions',
      width: 100,
      render: (_, record) => (
        <RecordRowActions
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={() => openEdit(record)}
          onDelete={() => handleDelete(record.id)}
          deleteTitle='Delete this careers branch?'
          deleteDescription='Applicants and job vacancies that use it will show no branch.'
        />
      ),
    },
  ];

  return (
    <div>
      {error && <Alert type='error' showIcon title={error} style={{ marginBottom: 16 }} />}
      <RecordToolbar
        searchPlaceholder='Search branch or code'
        onSearch={setSearchText}
        onRefresh={refetch}
        loading={isLoading}
        canCreate={canCreate}
        createLabel='Create Branch'
        onCreate={openCreate}
      />
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        pagination={tablePagination(10)}
      />
      <CareersBranchFormModal open={modalOpen} branch={editing} onClose={closeModal} onSaved={handleSaved} />
    </div>
  );
};

export default CareersBranchIndex;
