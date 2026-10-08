import { useMemo, useState } from 'react';
import { Table, Tag, Alert, Space, Button, Typography, Tooltip, App } from 'antd';
import { UsergroupAddOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import useAccessCharts from '../../hooks/useAccessCharts';
import accessChartApi from '../../services/approval/accessChartApi';
import handleApiError from '../../utils/handleApiError';
import { tablePagination } from '../../utils/tablePagination';
import RecordToolbar from '../record_management/RecordToolbar';
import RecordRowActions from '../record_management/RecordRowActions';
import AccessChartFormModal from './AccessChartFormModal';
import { isSystemChart, levelsOf, approversAt } from './approvalHelpers';
import ApprovingOfficersModal from './ApprovingOfficersModal';

// Access Charts — replaces vueportal's access_chart/AccessChartIndex.vue.
// One row per approval procedure (MRF, Leave Application, Manual Time Entry,
// older modules); the Approving Officers action (green, group icon) opens a
// dialog to manage each level's officers.
const AccessChartIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items, modules, users, isLoading, error, refetch } = useAccessCharts();

  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [officersFor, setOfficersFor] = useState(null); // chart id

  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('access-chart-create');
  const canEdit   = isAdmin || hasPermission('access-chart-edit');
  const canDelete = isAdmin || hasPermission('access-chart-delete');

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase();
    return items.filter((c) => !search
      || c.name.toLowerCase().includes(search)
      || (c.access_module?.name || '').toLowerCase().includes(search));
  }, [items, searchText]);

  const openCreate  = () => { setEditing(null); setModalOpen(true); };
  const openEdit    = (record) => { setEditing(record); setModalOpen(true); };
  const closeModal  = () => { setModalOpen(false); setEditing(null); };
  const handleSaved = () => { closeModal(); refetch(); };

  const handleDelete = async (id) => {
    try {
      const { data } = await accessChartApi.delete(id);
      message.success(data.success);
      refetch();
    } catch (err) {
      handleApiError(err, message);
    }
  };


  const columns = [
    {
      title: 'Approval Procedure',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name, r) => (
        <Space size={4}>
          {name}
          {isSystemChart(r) && <Tooltip title='Used by an HRIS module by this name'><Tag color='blue'>HRIS</Tag></Tooltip>}
        </Space>
      ),
    },
    { title: 'Module', key: 'module', render: (_, r) => r.access_module?.name || '—' },
    {
      title: 'Levels',
      key: 'levels',
      render: (_, r) => (levelsOf(r).length
        ? levelsOf(r).map((l) => <Tag key={l.level}>{`L${l.level}: ${l.num_of_approvers} needed · ${approversAt(r, l.level).length} officer(s)`}</Tag>)
        : <Typography.Text type='secondary'>Not set up</Typography.Text>),
    },
    {
      title: 'Actions',
      width: 130,
      fixed: 'right', // reachable on phones without scrolling the table
      render: (_, record) => (
        <Space>
          <Tooltip title='Approving Officers'>
            <Button color='green' variant='outlined' icon={<UsergroupAddOutlined />} size='small' onClick={() => setOfficersFor(record.id)} />
          </Tooltip>
          <RecordRowActions
          canEdit={canEdit}
          canDelete={canDelete && !isSystemChart(record)}
          onEdit={() => openEdit(record)}
          onDelete={() => handleDelete(record.id)}
          deleteTitle='Delete this access chart?'
          deleteDescription='Its levels and approving officers are removed too.'
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      {error && <Alert type='error' showIcon title={error} style={{ marginBottom: 16 }} />}
      <RecordToolbar
        searchPlaceholder='Search procedure or module'
        onSearch={setSearchText}
        onRefresh={refetch}
        loading={isLoading}
        canCreate={canCreate}
        createLabel='Create Access Chart'
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
      <AccessChartFormModal open={modalOpen} chart={editing} modules={modules} onClose={closeModal} onSaved={handleSaved} />
      <ApprovingOfficersModal
        chart={items.find((c) => c.id === officersFor) || null}
        users={users}
        canAdd={canCreate}
        canRemove={canDelete}
        onClose={() => setOfficersFor(null)}
        onChanged={refetch}
      />
    </div>
  );
};

export default AccessChartIndex;
