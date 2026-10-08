import { useMemo, useState } from 'react';
import { Table, Tag, Alert, Space, App } from 'antd';
import useAuth from '../../../hooks/useAuth';
import useLeaveTypes from '../../../hooks/useLeaveTypes';
import leaveTypeApi from '../../../services/leave/leaveTypeApi';
import handleApiError from '../../../utils/handleApiError';
import RecordToolbar from '../../record_management/RecordToolbar';
import RecordRowActions from '../../record_management/RecordRowActions';
import ActiveTag from '../../record_management/ActiveTag';
import ExpandIcon from '../../../components/ExpandIcon';
import { num } from '../leaveHelpers';
import LeaveTypeFormModal from './LeaveTypeFormModal';
import { tablePagination } from '../../../utils/tablePagination';

// Leave types and their rules: yearly credits (the default for every
// eligible employee; HR overrides per employee on Leave Balances),
// per-filing limit, how days are counted and who is eligible.
const LeaveTypeIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items, employmentTypes, isLoading, error, refetch } = useLeaveTypes();

  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);

  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('leave-type-create');
  const canEdit   = isAdmin || hasPermission('leave-type-edit');
  const canDelete = isAdmin || hasPermission('leave-type-delete');

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase();
    return items.filter((t) => !search || `${t.code} ${t.name}`.toLowerCase().includes(search));
  }, [items, searchText]);

  const openCreate  = () => { setEditing(null); setModalOpen(true); };
  const openEdit    = (record) => { setEditing(record); setModalOpen(true); };
  const closeModal  = () => { setModalOpen(false); setEditing(null); };
  const handleSaved = () => { closeModal(); refetch(); };

  const handleDelete = async (id) => {
    try {
      const { data } = await leaveTypeApi.delete(id);
      message.success(data.message);
      refetch();
    } catch (err) {
      handleApiError(err, message);
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', width: 90, sorter: (a, b) => a.code.localeCompare(b.code) },
    {
      title: 'Leave Type',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name, record) => (
        <Space size={4} wrap>
          {name}
          {!record.is_paid && <Tag>Unpaid</Tag>}
        </Space>
      ),
    },
    {
      title: 'Yearly Credits',
      dataIndex: 'yearly_credits',
      width: 130,
      render: (value) => (value === null ? <Tag>None</Tag> : num(value)),
    },
    {
      title: 'Max per Filing',
      dataIndex: 'max_days_per_filing',
      width: 130,
      render: (value, record) => (value === null ? '—' : `${num(value)}${record.counts_calendar_days ? ' (calendar days)' : ''}`),
    },
    {
      title: 'Eligibility',
      key: 'eligibility',
      render: (_, record) => {
        const rules = [
          record.gender && (record.gender === 'FEMALE' ? 'Female' : 'Male'),
          record.employment_types && record.employment_types.split(',').join(' / '),
          record.min_service_months > 0 && `${record.min_service_months}+ months of service`,
        ].filter(Boolean);
        return rules.length ? rules.map((r) => <Tag key={r}>{r}</Tag>) : 'All employees';
      },
    },
    { title: 'Status', dataIndex: 'active', width: 100, render: (value) => <ActiveTag active={value ? 'Y' : 'N'} /> },
    {
      title: 'Actions',
      width: 100,
      render: (_, record) => (
        <RecordRowActions
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={() => openEdit(record)}
          onDelete={() => handleDelete(record.id)}
          deleteTitle='Delete this leave type?'
          deleteDescription='Only possible while no leave was filed under it — otherwise set it inactive.'
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
        createLabel='Create Leave Type'
        onCreate={openCreate}
      />
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        scroll={{ x: 760 }}
        pagination={tablePagination(20)}
        expandable={{
          expandIcon: (props) => <ExpandIcon {...props} />,
          rowExpandable: (record) => !!record.description,
          expandedRowRender: (record) => record.description,
        }}
      />
      <LeaveTypeFormModal
        open={modalOpen}
        leaveType={editing}
        employmentTypes={employmentTypes}
        onClose={closeModal}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default LeaveTypeIndex;
