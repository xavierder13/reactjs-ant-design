import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Table, Tag, Button, Input, Select, DatePicker, Space, Popconfirm, Tooltip, message } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, SendOutlined, CloseCircleOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import useAuth from '../../../hooks/useAuth';
import useManpowerRequests from '../../../hooks/useManpowerRequests';
import manpowerRequestApi from '../../../services/manpower_request/manpowerRequestApi';
import handleApiError from '../../../utils/handleApiError';

const { RangePicker } = DatePicker;

const STATUS_COLORS = {
  Draft:              'default',
  'Pending Approval':  'gold',
  Approved:           'green',
  Disapproved:        'red',
  Returned:           'orange',
  Cancelled:          'default',
};

const ManpowerRequestIndex = () => {
  const { hasPermission, hasAnyPermission, hasRole, user } = useAuth();
  const { items, isLoading, refetch } = useManpowerRequests();
  const [messageApi, contextHolder] = message.useMessage();

  const [searchText, setSearchText]   = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [dateRange, setDateRange]     = useState(null);

  // Editing is Administrator-or-owner, same pattern as canDelete: Admin
  // bypasses ownership, everyone else needs the permission AND to be the
  // requestor. Status gate applies to both — even Administrators can't
  // edit past Draft/Disapproved/Cancelled/Returned.
  const canEdit = (record) =>
    ['Draft', 'Disapproved', 'Cancelled', 'Returned'].includes(record.status) &&
    (hasRole('Administrator') ||
      (hasAnyPermission('manpower-request-create', 'manpower-request-edit') && record.user_id === user.id));

  // Submit and Resubmit share the same backend permission/endpoint.
  // Resubmitting from Returned resumes approval at the same level instead
  // of restarting the chain — see ManpowerRequestService::submit().
  // Same Administrator-or-owner rule as canEdit, matching the backend's
  // ManpowerRequestService::submit().
  const canSubmit = (record) =>
    ['Draft', 'Disapproved', 'Cancelled', 'Returned'].includes(record.status) &&
    (hasRole('Administrator') ||
      (hasPermission('manpower-request-submit') && record.user_id === user.id));

  const canCancel = (record) =>
    hasPermission('manpower-request-cancel') &&
    ['Draft', 'Pending Approval', 'Returned'].includes(record.status) &&
    record.user_id === user.id;

  // Delete is a permanent hard-delete, unlike Cancel (which just changes
  // status). Administrators can delete any Draft/Cancelled request
  // regardless of who created it; everyone else needs the permission AND
  // to be the requestor.
  const canDelete = (record) =>
    ['Draft', 'Cancelled'].includes(record.status) &&
    (hasRole('Administrator') || (hasPermission('manpower-request-delete') && record.user_id === user.id));

  const handleSubmit = async (id) => {
    try {
      const { data } = await manpowerRequestApi.submit(id);
      messageApi.success(data.message);
      refetch();
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  const handleCancel = async (id) => {
    try {
      const { data } = await manpowerRequestApi.cancel(id);
      messageApi.success(data.message);
      refetch();
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { data } = await manpowerRequestApi.delete(id);
      messageApi.success(data.message);
      refetch();
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  const filteredItems = items.filter((record) => {
    const matchesSearch = !searchText || (
      record.mrf_number.toLowerCase().includes(searchText.toLowerCase()) ||
      record.reason?.toLowerCase().includes(searchText.toLowerCase())
    );
    const matchesStatus = !statusFilter || record.status === statusFilter;
    const matchesDate = !dateRange || (
      dayjs(record.created_at).isAfter(dateRange[0].startOf('day')) &&
      dayjs(record.created_at).isBefore(dateRange[1].endOf('day'))
    );
    return matchesSearch && matchesStatus && matchesDate;
  });

  const columns = [
    {
      title: 'MRF Number',
      dataIndex: 'mrf_number',
      render: (text, record) => <Link to={`/manpower-requests/${record.id}`}>{text}</Link>,
    },
    {
      title: 'Request Date',
      dataIndex: 'request_date',
      render: (date) => date ? dayjs(date).format('MM-DD-YYYY') : '—',
    },
    {
      title: 'Requestor',
      dataIndex: ['user', 'name'],
    },
    {
      title: 'Branch',
      dataIndex: ['branch', 'name'],
    },
    {
      title: 'Positions',
      dataIndex: 'details',
      render: (details) => details?.map((d) => d.position?.name).filter(Boolean).join(', ') || '—',
    },
    {
      title: 'Manpower Required',
      dataIndex: 'details',
      render: (details) => details?.reduce((sum, d) => sum + (d.quantity || 0), 0),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status) => <Tag color={STATUS_COLORS[status] || 'default'}>{status}</Tag>,
    },
    {
      title: 'Current Level',
      dataIndex: 'current_level',
      render: (level) => level || '—',
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      render: (date) => dayjs(date).format('MM-DD-YYYY'),
    },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View">
            <Link to={`/manpower-requests/${record.id}`}>
              <Button icon={<EyeOutlined />} size="small" />
            </Link>
          </Tooltip>

          {canEdit(record) && (
            <Tooltip title="Edit">
              <Link to={`/manpower-requests/${record.id}/edit`}>
                <Button icon={<EditOutlined />} size="small" />
              </Link>
            </Tooltip>
          )}

          {canSubmit(record) && (
            <Popconfirm
              title={`${['Disapproved', 'Cancelled', 'Returned'].includes(record.status) ? 'Resubmit' : 'Submit'} this request for approval?`}
              onConfirm={() => handleSubmit(record.id)}
            >
              <Tooltip title={['Disapproved', 'Cancelled', 'Returned'].includes(record.status) ? 'Resubmit for Approval' : 'Submit for Approval'}>
                <Button icon={<SendOutlined />} size="small" type="primary" />
              </Tooltip>
            </Popconfirm>
          )}

          {canCancel(record) && (
            <Popconfirm
              title="Cancel this request?"
              onConfirm={() => handleCancel(record.id)}
            >
              <Tooltip title="Cancel Request">
                <Button icon={<CloseCircleOutlined />} size="small" danger />
              </Tooltip>
            </Popconfirm>
          )}

          {canDelete(record) && (
            <Popconfirm
              title="Delete this request?"
              description="This permanently deletes the draft and cannot be undone."
              onConfirm={() => handleDelete(record.id)}
            >
              <Tooltip title="Delete Request">
                <Button icon={<DeleteOutlined />} size="small" danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}

      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <Input.Search
            placeholder="Search MRF number or reason"
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 240 }}
          />
          <Select
            placeholder="Status"
            allowClear
            style={{ width: 160 }}
            onChange={setStatusFilter}
            options={Object.keys(STATUS_COLORS).map((s) => ({ label: s, value: s }))}
          />
          <RangePicker onChange={setDateRange} />
        </Space>

        <Space>
          <Button icon={<ReloadOutlined />} onClick={refetch} loading={isLoading}>
            Refresh
          </Button>
          {hasPermission('manpower-request-create') && (
            <Link to="/manpower-requests/create">
              <Button type="primary" icon={<PlusOutlined />}>Create MRF</Button>
            </Link>
          )}
        </Space>
      </Space>

      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={filteredItems}
        loading={isLoading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />
    </div>
  );
};

export default ManpowerRequestIndex;