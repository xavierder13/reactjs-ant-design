import { useMemo, useState } from 'react';
import { Table, Alert, Tag, App } from 'antd';
import useAuth from '../../../../hooks/useAuth';
import useJobVacancies from '../../../../hooks/useJobVacancies';
import useCareersPositions from '../../../../hooks/useCareersPositions';
import useCareersBranches from '../../../../hooks/useCareersBranches';
import jobVacancyApi from '../../../../services/recruitment/jobVacancyApi';
import RecordToolbar from '../../../record_management/RecordToolbar';
import RecordRowActions from '../../../record_management/RecordRowActions';
import { resultMessage, showGatewayError } from '../setupHelpers';
import JobVacancyFormModal from './JobVacancyFormModal';
import { tablePagination } from '../../../../utils/tablePagination';

// Careers portal job vacancies — recruitment-portal
// recruitment/JobVacanciesIndex.vue, run through the vueportal gateway as
// the signed-in user. A vacancy = a careers position opened on the careers
// site for branch or admin applicants, with the branches hiring for it.
const JobVacancyIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items, isLoading, error, refetch } = useJobVacancies();

  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('careers-job-vacancy-create');
  const canEdit   = isAdmin || hasPermission('careers-job-vacancy-edit');
  const canDelete = isAdmin || hasPermission('careers-job-vacancy-delete');

  // Form options (portal page loads both lists too).
  const { items: positions } = useCareersPositions();
  const { items: branches }  = useCareersBranches();

  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editingId, setEditingId]   = useState(null);

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase();
    return items.filter((v) => !search || (
      v.position_name?.toLowerCase().includes(search) ||
      v.branch_type?.toLowerCase().includes(search)
    ));
  }, [items, searchText]);

  const openCreate  = () => { setEditingId(null); setModalOpen(true); };
  const openEdit    = (record) => { setEditingId(record.id); setModalOpen(true); };
  const closeModal  = () => { setModalOpen(false); setEditingId(null); };
  const handleSaved = () => { closeModal(); refetch(); };

  const handleDelete = async (id) => {
    try {
      const { data } = await jobVacancyApi.delete(id);
      if (data.success === false) {
        message.error(data.message || 'Job Vacancy Deletion failed!');
        return;
      }
      message.success(resultMessage(data, 'Job Vacancy Deleted Successfully!'));
      refetch();
    } catch (err) {
      showGatewayError(err, message);
    }
  };

  const columns = [
    { title: 'Position', dataIndex: 'position_name', sorter: (a, b) => (a.position_name || '').localeCompare(b.position_name || '') },
    {
      title: 'Branch Type',
      dataIndex: 'branch_type',
      width: 160,
      filters: [{ text: 'Branch Only', value: 'Branch Only' }, { text: 'Admin Only', value: 'Admin Only' }],
      onFilter: (value, record) => record.branch_type === value,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
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
          deleteTitle='Delete this job vacancy?'
          deleteDescription='It is removed from the careers site.'
        />
      ),
    },
  ];

  return (
    <div>
      {error && <Alert type='error' showIcon title={error} style={{ marginBottom: 16 }} />}
      <RecordToolbar
        searchPlaceholder='Search position or branch type'
        onSearch={setSearchText}
        onRefresh={refetch}
        loading={isLoading}
        canCreate={canCreate}
        createLabel='Create Job Vacancy'
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
      <JobVacancyFormModal
        open={modalOpen}
        vacancyId={editingId}
        positions={positions}
        branches={branches}
        onClose={closeModal}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default JobVacancyIndex;
