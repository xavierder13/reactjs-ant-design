import { useMemo, useState } from 'react';
import { Table, Alert, App } from 'antd';
import useAuth from '../../hooks/useAuth';
import useShifts from '../../hooks/useShifts';
import shiftApi from '../../services/shift/shiftApi';
import handleApiError from '../../utils/handleApiError';
import { tablePagination } from '../../utils/tablePagination';
import RecordToolbar from '../record_management/RecordToolbar';
import RecordRowActions from '../record_management/RecordRowActions';
import ActiveTag from '../record_management/ActiveTag';
import { patternSummary } from './shiftHelpers';
import ShiftFormModal from './ShiftFormModal';

// Shift patterns for temporary shifting (relieving). The employee's fixed
// schedule is their Work Schedule (EMD tab); a shift overrides it only for
// the dates of a shifting (Time & Leave → Shifting).
const ShiftIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items, isLoading, error, refetch } = useShifts();

  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);

  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('shift-create');
  const canEdit   = isAdmin || hasPermission('shift-edit');
  const canDelete = isAdmin || hasPermission('shift-delete');

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase();
    return items.filter((s) => !search || `${s.code} ${s.name}`.toLowerCase().includes(search));
  }, [items, searchText]);

  const openCreate  = () => { setEditing(null); setModalOpen(true); };
  const openEdit    = (record) => { setEditing(record); setModalOpen(true); };
  const closeModal  = () => { setModalOpen(false); setEditing(null); };
  const handleSaved = () => { closeModal(); refetch(); };

  const handleDelete = async (id) => {
    try {
      const { data } = await shiftApi.delete(id);
      message.success(data.message);
      refetch();
    } catch (err) {
      handleApiError(err, message);
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', width: 140, sorter: (a, b) => a.code.localeCompare(b.code) },
    { title: 'Name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Weekly Pattern', key: 'pattern', render: (_, r) => patternSummary(r.days) },
    { title: 'Grace', dataIndex: 'grace_minutes', width: 80, render: (v) => `${v} min` },
    { title: 'Status', dataIndex: 'active', width: 100, render: (v) => <ActiveTag active={v ? 'Y' : 'N'} /> },
    {
      title: 'Actions',
      width: 100,
      render: (_, record) => (
        <RecordRowActions
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={() => openEdit(record)}
          onDelete={() => handleDelete(record.id)}
          deleteTitle='Delete this shift?'
          deleteDescription='Only possible while it was never assigned — otherwise set it inactive.'
        />
      ),
    },
  ];

  return (
    <div>
      {error && <Alert type='error' showIcon title={error} style={{ marginBottom: 16 }} />}
      <RecordToolbar
        searchPlaceholder='Search code or name'
        onSearch={setSearchText}
        onRefresh={refetch}
        loading={isLoading}
        canCreate={canCreate}
        createLabel='Create Shift'
        onCreate={openCreate}
      />
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        scroll={{ x: 800 }}
        pagination={tablePagination(10)}
      />
      <ShiftFormModal open={modalOpen} shift={editing} onClose={closeModal} onSaved={handleSaved} />
    </div>
  );
};

export default ShiftIndex;
