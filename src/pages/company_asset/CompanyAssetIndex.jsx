import { useEffect, useState } from 'react';
import {
  Table, Tag, Button, Space, Tooltip, Select, Input, Popconfirm, Typography, App,
} from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import companyAssetApi from '../../services/company_asset/companyAssetApi';
import handleApiError from '../../utils/handleApiError';
import { formatDate } from '../../utils/formatDate';
import { PAGE_SIZE_OPTIONS, showRecordRange } from '../../utils/tablePagination';
import { peso } from '../payroll/payrollHelpers';
import { ASSET_STATUSES, ASSET_STATUS_COLORS, assignedTo } from './companyAssetHelpers';
import AssetFormModal from './AssetFormModal';
import AssetDetailsModal from './AssetDetailsModal';
import AssetAssignModal from './AssetAssignModal';
import AssetDisposeModal from './AssetDisposeModal';

// Company Assets (/company-assets): the registry of non-IT company property
// (vueportal Company Asset module — the same data as its Vue Asset
// Management page). Server-side search / filters / pagination. Row actions:
// View (details, history, maintenance, Assign / Return / Dispose), Edit,
// Delete — each by its company-asset-* permission (Administrator: all).
const CompanyAssetIndex = () => {
  const { message } = App.useApp();
  const { hasRole, hasPermission } = useAuth();
  const isAdmin = hasRole('Administrator');
  const can = {
    create: isAdmin || hasPermission('company-asset-create'),
    edit: isAdmin || hasPermission('company-asset-edit'),
    delete: isAdmin || hasPermission('company-asset-delete'),
    assign: isAdmin || hasPermission('company-asset-assign'),
    dispose: isAdmin || hasPermission('company-asset-dispose'),
    maintenance: isAdmin || hasPermission('company-asset-maintenance'),
  };

  const [options, setOptions] = useState({ asset_categories: [], branches: [], departments: [] });
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState({ current: 1, pageSize: 20 });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [disposing, setDisposing] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await companyAssetApi.getAll({ ...filters, search: search || undefined, page: page.current, items_per_page: page.pageSize });
      setRows(data.company_assets.data);
      setTotal(data.company_assets.total);
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
  }, [filters, search, page]);

  const loadOptions = async () => {
    try {
      const { data } = await companyAssetApi.getCreate();
      setOptions(data);
    } catch (error) {
      handleApiError(error, message);
    }
  };

  useEffect(() => {
    const load = async () => { await loadOptions(); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setFilter = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage((p) => ({ ...p, current: 1 })); };
  const afterChange = () => { fetchRows(); setReloadKey((k) => k + 1); };

  const remove = async (record) => {
    try {
      await companyAssetApi.delete(record.id);
      message.success('Asset has been deleted.');
      fetchRows();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const columns = [
    { title: 'Asset Tag', dataIndex: 'asset_tag', width: 150 },
    {
      title: 'Asset',
      key: 'asset',
      render: (_, r) => (
        <div>
          <div>{r.name}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{[r.asset_category?.name, r.brand, r.model, r.serial_number && `S/N ${r.serial_number}`].filter(Boolean).join(' · ')}</div>
        </div>
      ),
    },
    {
      title: 'Assigned To',
      key: 'assigned',
      render: (_, r) => (assignedTo(r) ? (
        <div>
          <div><Tag>{r.assignment_type}</Tag>{assignedTo(r)}</div>
          {r.date_assigned && <div style={{ color: '#8c8c8c', fontSize: 12 }}>{`since ${formatDate(r.date_assigned)}`}</div>}
        </div>
      ) : <Typography.Text type='secondary'>Not assigned</Typography.Text>),
    },
    { title: 'Book Value', dataIndex: 'book_value', width: 130, align: 'right', render: (v) => (v === null || v === undefined ? '—' : peso(v)) },
    { title: 'Status', dataIndex: 'status', width: 120, render: (s) => <Tag color={ASSET_STATUS_COLORS[s]}>{s}</Tag> },
    {
      title: 'Actions',
      width: 120,
      render: (_, r) => (
        <Space>
          <Tooltip title='View'>
            <Button color='blue' variant='outlined' icon={<EyeOutlined />} size='small' onClick={() => setViewing(r.id)} />
          </Tooltip>
          {can.edit && !r.disposed_at && (
            <Tooltip title='Edit'>
              <Button color='green' variant='outlined' icon={<EditOutlined />} size='small' onClick={() => { setEditing(r); setFormOpen(true); }} />
            </Tooltip>
          )}
          {can.delete && (
            <Popconfirm title={`Delete ${r.asset_tag}?`} description='Its assignment history and maintenance log go with it.' onConfirm={() => remove(r)}>
              <Tooltip title='Delete'>
                <Button danger icon={<DeleteOutlined />} size='small' />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Select allowClear placeholder='All categories' value={filters.asset_category_id} onChange={(v) => setFilter({ asset_category_id: v })}
            options={options.asset_categories.map((c) => ({ value: c.id, label: c.name }))} style={{ width: 190 }} />
          <Select allowClear placeholder='All statuses' value={filters.status} onChange={(v) => setFilter({ status: v })}
            options={ASSET_STATUSES.map((s) => ({ value: s, label: s }))} style={{ width: 150 }} />
          <Select allowClear placeholder='Assigned or not' value={filters.assignment_type} onChange={(v) => setFilter({ assignment_type: v })}
            options={[{ value: 'Employee', label: 'Assigned to an employee' }, { value: 'Area', label: 'Assigned to an area' }]} style={{ width: 200 }} />
          <Select allowClear placeholder='All branches' value={filters.branch_id} onChange={(v) => setFilter({ branch_id: v })} showSearch={{ optionFilterProp: 'label' }}
            options={options.branches.map((b) => ({ value: b.id, label: b.name }))} style={{ width: 200 }} />
          <Input.Search placeholder='Tag, name or serial no.' allowClear onSearch={(v) => { setSearch(v.trim()); setPage((p) => ({ ...p, current: 1 })); }} style={{ width: 230 }} />
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchRows} loading={loading}>Refresh</Button>
          {can.create && <Button type='primary' icon={<PlusOutlined />} onClick={() => { setEditing(null); setFormOpen(true); }}>Add Asset</Button>}
        </Space>
      </Space>
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: 1000 }}
        pagination={{
          current: page.current,
          pageSize: page.pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          showTotal: showRecordRange,
          onChange: (current, pageSize) => setPage({ current, pageSize }),
        }}
      />
      <AssetFormModal
        open={formOpen}
        asset={editing}
        options={options}
        canAssign={can.assign}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={() => { setFormOpen(false); setEditing(null); fetchRows(); loadOptions(); }}
      />
      <AssetDetailsModal
        assetId={viewing}
        can={can}
        reloadKey={reloadKey}
        onClose={() => setViewing(null)}
        onAssign={setAssigning}
        onDispose={setDisposing}
        onChanged={fetchRows}
      />
      <AssetAssignModal asset={assigning} options={options} onClose={() => setAssigning(null)} onSaved={() => { setAssigning(null); afterChange(); }} />
      <AssetDisposeModal asset={disposing} onClose={() => setDisposing(null)} onSaved={() => { setDisposing(null); afterChange(); }} />
    </div>
  );
};

export default CompanyAssetIndex;
