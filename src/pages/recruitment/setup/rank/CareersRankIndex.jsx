import { useMemo, useState } from 'react';
import { Table, Alert, App } from 'antd';
import useAuth from '../../../../hooks/useAuth';
import useCareersRanks from '../../../../hooks/useCareersRanks';
import useCareersPositions from '../../../../hooks/useCareersPositions';
import careersRankApi from '../../../../services/recruitment/careersRankApi';
import RecordToolbar from '../../../record_management/RecordToolbar';
import RecordRowActions from '../../../record_management/RecordRowActions';
import { resultMessage, showGatewayError } from '../setupHelpers';
import CareersRankFormModal from './CareersRankFormModal';
import { tablePagination } from '../../../../utils/tablePagination';

// Careers portal ranks — recruitment-portal rank/RankIndex.vue, run through
// the vueportal gateway as the signed-in user. A rank groups careers
// positions (Executive, Managerial, …) on the careers site.
const CareersRankIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items, isLoading, error, refetch } = useCareersRanks();
  // How many careers positions use each rank (the portal deletes a rank in
  // use without warning — shown here and in the delete confirmation).
  const { items: positions } = useCareersPositions();

  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);

  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('careers-rank-create');
  const canEdit   = isAdmin || hasPermission('careers-rank-edit');
  const canDelete = isAdmin || hasPermission('careers-rank-delete');

  const positionCount = useMemo(() => {
    const counts = {};
    positions.forEach((p) => { counts[p.rank_id] = (counts[p.rank_id] || 0) + 1; });
    return counts;
  }, [positions]);

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase();
    return items.filter((rank) => !search || rank.name.toLowerCase().includes(search));
  }, [items, searchText]);

  const openCreate  = () => { setEditing(null); setModalOpen(true); };
  const openEdit    = (record) => { setEditing(record); setModalOpen(true); };
  const closeModal  = () => { setModalOpen(false); setEditing(null); };
  const handleSaved = () => { closeModal(); refetch(); };

  const handleDelete = async (id) => {
    try {
      const { data } = await careersRankApi.delete(id);
      message.success(resultMessage(data, 'Record has been deleted'));
      refetch();
    } catch (err) {
      showGatewayError(err, message);
    }
  };

  const columns = [
    { title: 'Rank', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: 'Positions',
      key: 'positions',
      width: 120,
      render: (_, record) => positionCount[record.id] || 0,
      sorter: (a, b) => (positionCount[a.id] || 0) - (positionCount[b.id] || 0),
    },
    {
      title: 'Actions',
      width: 100,
      render: (_, record) => {
        const used = positionCount[record.id] || 0;
        return (
          <RecordRowActions
            canEdit={canEdit}
            canDelete={canDelete}
            onEdit={() => openEdit(record)}
            onDelete={() => handleDelete(record.id)}
            deleteTitle='Delete this careers rank?'
            deleteDescription={used
              ? `${used} position${used === 1 ? '' : 's'} use${used === 1 ? 's' : ''} it and will need a new rank.`
              : 'No careers position uses it.'}
          />
        );
      },
    },
  ];

  return (
    <div>
      {error && <Alert type='error' showIcon title={error} style={{ marginBottom: 16 }} />}
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
        pagination={tablePagination(10)}
      />
      <CareersRankFormModal open={modalOpen} rank={editing} onClose={closeModal} onSaved={handleSaved} />
    </div>
  );
};

export default CareersRankIndex;
