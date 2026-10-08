import { useMemo, useState } from 'react';
import { Table, App } from 'antd';
import useAuth from '../../../hooks/useAuth';
import useDepartmentRecords from '../../../hooks/useDepartmentRecords';
import useDepartmentStore from '../../../store/departmentStore';
import useEmployeeFormOptionsStore from '../../../store/employeeFormOptionsStore';
import departmentApi from '../../../services/record_management/departmentApi';
import handleApiError from '../../../utils/handleApiError';
import RecordToolbar from '../RecordToolbar';
import RecordRowActions from '../RecordRowActions';
import ActiveTag from '../ActiveTag';
import DepartmentFormModal from './DepartmentFormModal';
import { tablePagination } from '../../../utils/tablePagination';

// Department maintenance — replaces vueportal's department/DepartmentIndex.vue.
const DepartmentIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items, divisions, isLoading, refetch } = useDepartmentRecords();

  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);

  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('department-create');
  const canEdit   = isAdmin || hasPermission('department-edit');
  const canDelete = isAdmin || hasPermission('department-delete');

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase();
    return items.filter((department) => !search || (
      department.name.toLowerCase().includes(search) ||
      department.division?.name.toLowerCase().includes(search)
    ));
  }, [items, searchText]);

  // Other pages' department dropdowns use the cached lookup store —
  // refetch it on the next page that needs it.
  const reload = () => { refetch(); useDepartmentStore.setState({ isLoaded: false }); useEmployeeFormOptionsStore.setState({ isLoaded: false }); };

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (record) => { setEditing(record); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };
  const handleSaved = () => { closeModal(); reload(); };

  const handleDelete = async (id) => {
    try {
      const { data } = await departmentApi.delete(id);
      message.success(data.success);
      reload();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const columns = [
    { title: 'Department', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: 'Division',
      dataIndex: ['division', 'name'],
      render: (name) => name || '—',
      sorter: (a, b) => (a.division?.name || '').localeCompare(b.division?.name || ''),
    },
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
          deleteTitle='Delete this department?'
          deleteDescription='Positions and employees in it will show no department.'
        />
      ),
    },
  ];

  return (
    <div>
      <RecordToolbar
        searchPlaceholder='Search department or division'
        onSearch={setSearchText}
        onRefresh={refetch}
        loading={isLoading}
        canCreate={canCreate}
        createLabel='Create Department'
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
      <DepartmentFormModal
        open={modalOpen}
        department={editing}
        divisions={divisions}
        onClose={closeModal}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default DepartmentIndex;
