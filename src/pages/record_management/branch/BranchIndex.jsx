import { useMemo, useState } from 'react';
import { Table, App } from 'antd';
import useAuth from '../../../hooks/useAuth';
import useBranchRecords from '../../../hooks/useBranchRecords';
import useBranchStore from '../../../store/branchStore';
import useEmployeeFormOptionsStore from '../../../store/employeeFormOptionsStore';
import branchApi from '../../../services/record_management/branchApi';
import handleApiError from '../../../utils/handleApiError';
import RecordToolbar from '../RecordToolbar';
import RecordRowActions from '../RecordRowActions';
import BranchFormModal from './BranchFormModal';

// Branch maintenance — replaces vueportal's branch/BranchIndex.vue.
const BranchIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items, companies, isLoading, refetch } = useBranchRecords();

  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);

  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('branch-create');
  const canEdit   = isAdmin || hasPermission('branch-edit');
  const canDelete = isAdmin || hasPermission('branch-delete');

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase();
    return items.filter((branch) => !search || (
      branch.name.toLowerCase().includes(search) ||
      branch.code?.toLowerCase().includes(search) ||
      branch.bm_oic?.toLowerCase().includes(search) ||
      branch.company?.name.toLowerCase().includes(search)
    ));
  }, [items, searchText]);

  // Other pages' branch dropdowns/filters use the cached lookup store —
  // refetch it on the next page that needs it.
  const reload = () => { refetch(); useBranchStore.setState({ isLoaded: false }); useEmployeeFormOptionsStore.setState({ isLoaded: false }); };

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (record) => { setEditing(record); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };
  const handleSaved = () => { closeModal(); reload(); };

  const handleDelete = async (id) => {
    try {
      const { data } = await branchApi.delete(id);
      message.success(data.success);
      reload();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const columns = [
    { title: 'Branch', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Branch Code', dataIndex: 'code', width: 140 },
    { title: 'BM/OIC', dataIndex: 'bm_oic', render: (v) => v || '—' },
    {
      title: 'Company',
      dataIndex: ['company', 'name'],
      render: (name) => name || '—',
      sorter: (a, b) => (a.company?.name || '').localeCompare(b.company?.name || ''),
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
          deleteTitle='Delete this branch?'
          deleteDescription='Employees and users assigned to it will show no branch.'
        />
      ),
    },
  ];

  return (
    <div>
      <RecordToolbar
        searchPlaceholder='Search branch, code, BM/OIC or company'
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
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />
      <BranchFormModal
        open={modalOpen}
        branch={editing}
        companies={companies}
        onClose={closeModal}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default BranchIndex;
