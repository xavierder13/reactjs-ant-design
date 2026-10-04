import { useMemo, useState } from 'react';
import { Table, App } from 'antd';
import useAuth from '../../../hooks/useAuth';
import useRanks from '../../../hooks/useRanks';
import rankApi from '../../../services/record_management/rankApi';
import handleApiError from '../../../utils/handleApiError';
import RecordToolbar from '../RecordToolbar';
import RecordRowActions from '../RecordRowActions';
import RankFormModal from './RankFormModal';

// Rank maintenance — replaces vueportal's rank/RankIndex.vue.
const RankIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items, isLoading, refetch } = useRanks();

  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);

  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('rank-create');
  const canEdit   = isAdmin || hasPermission('rank-edit');
  const canDelete = isAdmin || hasPermission('rank-delete');

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase();
    return items.filter((rank) => !search || rank.name.toLowerCase().includes(search));
  }, [items, searchText]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (record) => { setEditing(record); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };
  const handleSaved = () => { closeModal(); refetch(); };

  const handleDelete = async (id) => {
    try {
      const { data } = await rankApi.delete(id);
      message.success(data.success);
      refetch();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const columns = [
    { title: 'Rank', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: 'Actions',
      width: 100,
      render: (_, record) => (
        <RecordRowActions
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={() => openEdit(record)}
          onDelete={() => handleDelete(record.id)}
          deleteTitle='Delete this rank?'
          deleteDescription='Positions with this rank will show no rank.'
        />
      ),
    },
  ];

  return (
    <div>
      <RecordToolbar
        searchPlaceholder='Search rank'
        onSearch={setSearchText}
        onRefresh={refetch}
        loading={isLoading}
        canCreate={canCreate}
        createLabel='Create Rank'
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
      <RankFormModal open={modalOpen} rank={editing} onClose={closeModal} onSaved={handleSaved} />
    </div>
  );
};

export default RankIndex;
