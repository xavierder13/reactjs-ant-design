import { useMemo, useState } from 'react';
import { Table, App } from 'antd';
import useAuth from '../../../hooks/useAuth';
import useCompanies from '../../../hooks/useCompanies';
import useBranchStore from '../../../store/branchStore';
import companyApi from '../../../services/record_management/companyApi';
import handleApiError from '../../../utils/handleApiError';
import RecordToolbar from '../RecordToolbar';
import RecordRowActions from '../RecordRowActions';
import ActiveTag from '../ActiveTag';
import CompanyFormModal from './CompanyFormModal';
import { tablePagination } from '../../../utils/tablePagination';

// Company maintenance — replaces vueportal's company/CompanyIndex.vue.
const CompanyIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items, isLoading, refetch } = useCompanies();

  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);

  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('company-create');
  const canEdit   = isAdmin || hasPermission('company-edit');
  const canDelete = isAdmin || hasPermission('company-delete');

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase();
    return items.filter((company) => !search || company.name.toLowerCase().includes(search));
  }, [items, searchText]);

  // The cached branch lookup carries each branch's company — refetch it on
  // the next page that needs it.
  const reload = () => { refetch(); useBranchStore.setState({ isLoaded: false }); };

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (record) => { setEditing(record); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };
  const handleSaved = () => { closeModal(); reload(); };

  const handleDelete = async (id) => {
    try {
      const { data } = await companyApi.delete(id);
      message.success(data.success);
      reload();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const columns = [
    { title: 'Company', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Branches', dataIndex: 'branches', width: 110, render: (branches) => branches?.length ?? 0 },
    { title: 'Status', dataIndex: 'active', width: 110, render: (active) => <ActiveTag active={active} /> },
    {
      title: 'Actions',
      width: 100,
      render: (_, record) => (
        <RecordRowActions
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={() => openEdit(record)}
          onDelete={() => handleDelete(record.id)}
          deleteTitle='Delete this company?'
          deleteDescription={record.branches?.length
            ? `${record.branches.length} branch(es) still belong to it and will show no company.`
            : 'No branches belong to it.'}
        />
      ),
    },
  ];

  return (
    <div>
      <RecordToolbar
        searchPlaceholder='Search company'
        onSearch={setSearchText}
        onRefresh={refetch}
        loading={isLoading}
        canCreate={canCreate}
        createLabel='Create Company'
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
      <CompanyFormModal open={modalOpen} company={editing} onClose={closeModal} onSaved={handleSaved} />
    </div>
  );
};

export default CompanyIndex;
