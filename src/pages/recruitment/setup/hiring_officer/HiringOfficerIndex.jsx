import { useMemo, useState } from 'react';
import { Table, Alert, Tag, App } from 'antd';
import useAuth from '../../../../hooks/useAuth';
import useHiringOfficers from '../../../../hooks/useHiringOfficers';
import hiringOfficerApi from '../../../../services/recruitment/hiringOfficerApi';
import handleApiError from '../../../../utils/handleApiError';
import RecordToolbar from '../../../record_management/RecordToolbar';
import RecordRowActions from '../../../record_management/RecordRowActions';
import HiringOfficerFormModal from './HiringOfficerFormModal';
import { officerName, ineligibleReason } from './hiringOfficer';
import { tablePagination } from '../../../../utils/tablePagination';

// Hiring officers — the Hiring Officer Name options on an applicant's Final
// Interview step; picking one there fills its position. Each is an Employee
// Master Data record (active, ADMINISTRATION, Managerial-rank position).
// This HRIS's own records (not the careers portal's).
const HiringOfficerIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items, rule, isLoading, error, refetch } = useHiringOfficers();

  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);

  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('hiring-officer-create');
  const canEdit   = isAdmin || hasPermission('hiring-officer-edit');
  const canDelete = isAdmin || hasPermission('hiring-officer-delete');

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase();
    return items.filter((o) => !search || [
      o.employee?.employee_code, o.employee?.full_name, officerName(o.employee), o.employee?.position?.name,
    ].some((value) => value?.toLowerCase().includes(search)));
  }, [items, searchText]);

  const openCreate  = () => { setEditing(null); setModalOpen(true); };
  const openEdit    = (record) => { setEditing(record); setModalOpen(true); };
  const closeModal  = () => { setModalOpen(false); setEditing(null); };
  const handleSaved = () => { closeModal(); refetch(); };

  const handleDelete = async (id) => {
    try {
      const { data } = await hiringOfficerApi.delete(id);
      message.success(data.message || 'Hiring officer has been deleted.');
      refetch();
    } catch (err) {
      handleApiError(err, message);
    }
  };

  const columns = [
    { title: 'Employee Code', dataIndex: ['employee', 'employee_code'], width: 140 },
    {
      title: 'Hiring Officer Name',
      key: 'name',
      render: (_, record) => record.employee?.full_name || '—',
      sorter: (a, b) => (a.employee?.full_name || '').localeCompare(b.employee?.full_name || ''),
    },
    {
      title: 'Position',
      key: 'position',
      render: (_, record) => record.employee?.position?.name || '—',
      sorter: (a, b) => (a.employee?.position?.name || '').localeCompare(b.employee?.position?.name || ''),
    },
    {
      title: 'Status',
      key: 'status',
      width: 200,
      render: (_, record) => {
        const reason = ineligibleReason(record, rule);
        return reason ? <Tag color='orange'>{reason}</Tag> : <Tag color='green'>Eligible</Tag>;
      },
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
          deleteTitle='Delete this hiring officer?'
          deleteDescription='Applicants already saved with this officer keep the name.'
        />
      ),
    },
  ];

  return (
    <div>
      {error && <Alert type='error' showIcon title={error} style={{ marginBottom: 16 }} />}
      <RecordToolbar
        searchPlaceholder='Search code, name or position'
        onSearch={setSearchText}
        onRefresh={refetch}
        loading={isLoading}
        canCreate={canCreate}
        createLabel='Create Hiring Officer'
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
      <HiringOfficerFormModal open={modalOpen} hiringOfficer={editing} onClose={closeModal} onSaved={handleSaved} />
    </div>
  );
};

export default HiringOfficerIndex;
