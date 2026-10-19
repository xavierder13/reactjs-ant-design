import { useEffect, useState } from 'react';
import {
  Table, Tag, Button, Space, Tooltip, Select, DatePicker, Popconfirm, Alert, App,
} from 'antd';
import { EyeOutlined, EditOutlined, CloseCircleOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import filingAccess from '../../utils/filingAccess';
import myFilingApi from '../../services/my_filing/myFilingApi';
import handleApiError from '../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../utils/formatDate';
import { PAGE_SIZE_OPTIONS, showRecordRange } from '../../utils/tablePagination';
import PaidTag from '../../components/approval/PaidTag';

// The signed-in employee's own filings of one module (My Leave / My Time
// Entries / My Overtime): only their own (myFilingApi), filed / edited /
// cancelled through the module's own form and api with the *-own
// permissions, opened in the module's own details modal. No employee
// column, no approval toggle — approving lives under Time & Leave.
// `config` = { module ('leave' | 'time_entry' | 'overtime'), prefix
// ('leave' | 'time-entry' | 'overtime'), rowsKey, noun, statuses,
// statusColors, columns, api (the module api: act), FormModal, formProps
// (record) → props, DetailsModal, detailsIdProp, header (data → node) }.
const MyFilingList = ({ config }) => {
  const { message } = App.useApp();
  const auth = useAuth();
  const access = filingAccess(auth, config.prefix);
  const canFile = access.canCreate && !!access.ownEmployeeId;
  const { FormModal, DetailsModal } = config;

  const [filters, setFilters] = useState({});
  const [page, setPage] = useState({ current: 1, pageSize: 20 });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data: res } = await myFilingApi.getAll(config.module, { ...filters, page: page.current, per_page: page.pageSize });
      setData(res);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchRows(); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const setFilter = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage((p) => ({ ...p, current: 1 })); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const cancelFiling = async (record) => {
    try {
      const { data: res } = await config.api.act('cancel', record.id, null);
      message.success(res.message);
      fetchRows();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const rows = data?.[config.rowsKey]?.data || [];
  const columns = [
    ...config.columns,
    {
      title: 'Status',
      dataIndex: 'status',
      width: 150,
      render: (s, r) => (
        <>
          <Tag color={config.statusColors[s]}>{s === 'Pending' && r.current_level ? `Pending · Level ${r.current_level}` : s}</Tag>
          <PaidTag paidIn={r.paid_in} pendingIn={r.pending_in} />
        </>
      ),
    },
    {
      title: 'Actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title='View'>
            <Button color='blue' variant='outlined' icon={<EyeOutlined />} size='small' onClick={() => setViewing(record.id)} />
          </Tooltip>
          {access.canEdit(record) && record.status === 'Pending' && (
            <Tooltip title='Edit'>
              <Button color='green' variant='outlined' icon={<EditOutlined />} size='small' onClick={() => { setEditing(record); setFormOpen(true); }} />
            </Tooltip>
          )}
          {access.canCancel(record) && ['Pending', 'Approved'].includes(record.status) && !record.paid_in && !record.pending_in && (
            <Popconfirm title={`Cancel this ${config.noun}?`} onConfirm={() => cancelFiling(record)}>
              <Tooltip title='Cancel'>
                <Button color='orange' variant='outlined' icon={<CloseCircleOutlined />} size='small' />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {data && !data.linked && (
        <Alert type='warning' showIcon style={{ marginBottom: 16 }} title={`Your account is not linked to an employee record — ask HR to link it to see and file your own ${config.noun}s.`} />
      )}
      {data && config.header ? config.header(data) : null}
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Select
            allowClear
            placeholder='All statuses'
            value={filters.status}
            onChange={(v) => setFilter({ status: v })}
            options={config.statuses.map((s) => ({ value: s, label: s }))}
            style={{ width: 150 }}
          />
          <DatePicker.RangePicker
            format={DISPLAY_DATE_FORMAT}
            onChange={(range) => setFilter({
              date_from: range?.[0]?.format('YYYY-MM-DD'),
              date_to: range?.[1]?.format('YYYY-MM-DD'),
            })}
          />
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchRows} loading={loading}>Refresh</Button>
          {canFile && <Button type='primary' icon={<PlusOutlined />} onClick={() => { setEditing(null); setFormOpen(true); }}>{`File ${config.title}`}</Button>}
        </Space>
      </Space>
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: 800 }}
        pagination={{
          current: page.current,
          pageSize: page.pageSize,
          total: data?.[config.rowsKey]?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          showTotal: showRecordRange,
          onChange: (current, pageSize) => setPage({ current, pageSize }),
        }}
      />
      <FormModal
        open={formOpen}
        {...config.formProps(editing, data)}
        ownOnly
        onClose={closeForm}
        onSaved={() => { closeForm(); fetchRows(); }}
      />
      <DetailsModal
        {...{ [config.detailsIdProp]: viewing }}
        fetchDetails={(id) => myFilingApi.show(config.module, id)}
        onClose={() => setViewing(null)}
        onActed={() => { setViewing(null); fetchRows(); }}
      />
    </div>
  );
};

export default MyFilingList;
