import { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Tooltip, Select, Input, Popconfirm, Segmented, Typography, App } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import useAuth from '../../../hooks/useAuth';
import allowanceApi from '../../../services/payroll/allowanceApi';
import handleApiError from '../../../utils/handleApiError';
import { formatDate } from '../../../utils/formatDate';
import { PAGE_SIZE_OPTIONS, showRecordRange } from '../../../utils/tablePagination';
import { employeeName, peso } from '../payrollHelpers';
import GenerateTemplateModal from '../../employee_master_data/components/GenerateTemplateModal';
import ImportDataModal from '../../employee_master_data/components/ImportDataModal';
import AllowanceFormModal from './AllowanceFormModal';

const STATES = [
  { value: 'current', label: 'Current' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended', label: 'Ended' },
  { value: 'all', label: 'All' },
];

// Employee allowances by effective dates (per cut-off / per week / per month
// / per day worked). A change of amount = end the current one, add the new
// one. No approval — saved by permission. Bulk changes: Generate Template →
// fill effective_from + the new amount → Import. Server-side filters and
// pagination.
const AllowanceIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('allowance-create');
  const canEdit   = isAdmin || hasPermission('allowance-edit');
  const canDelete = isAdmin || hasPermission('allowance-delete');
  const canTemplate = isAdmin || hasPermission('allowance-template-download');
  const canImport = isAdmin || hasPermission('allowance-import');

  const [options, setOptions] = useState({ types: [], bases: [], branches: [] });
  const [filters, setFilters] = useState({ state: 'current' });
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState({ current: 1, pageSize: 20 });
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // {} = add
  const [templateOpen, setTemplateOpen] = useState(false);
  const [importOpen, setImportOpen]     = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await allowanceApi.getAll({ ...filters, search: search || undefined, page: page.current, per_page: page.pageSize });
      setRows(data.allowances.data);
      setTotal(data.allowances.total);
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

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await allowanceApi.getOptions();
        setOptions(data);
      } catch (error) {
        handleApiError(error, message);
      }
    };
    load();
  }, [message]);

  const setFilter = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage((p) => ({ ...p, current: 1 })); };

  // edit needs the full record (the list rows are flattened)
  const openEdit = async (id) => {
    try {
      const { data } = await allowanceApi.show(id);
      setEditing(data.allowance);
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const remove = async (record) => {
    try {
      const { data } = await allowanceApi.delete(record.id);
      message.success(data.message);
      fetchRows();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      width: 240,
      fixed: 'left',
      render: (_, r) => (
        <div>
          <div>{employeeName(r)} {!r.active && <Tag>Inactive</Tag>}</div>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>{r.employee_code} · {r.branch || '-'}</Typography.Text>
        </div>
      ),
    },
    {
      title: 'Allowance',
      key: 'type',
      width: 240,
      render: (_, r) => (
        <Space size={4} wrap>
          {r.type_name}
          {Number(r.de_minimis) ? <Tag color='green'>De minimis</Tag> : Number(r.taxable) ? <Tag color='orange'>Taxable</Tag> : <Tag color='green'>Non-taxable</Tag>}
        </Space>
      ),
    },
    { title: 'Amount', dataIndex: 'amount', width: 130, align: 'right', render: (v) => peso(v) },
    { title: 'Basis', dataIndex: 'basis', width: 130 },
    {
      title: 'Effective',
      key: 'effective',
      width: 210,
      render: (_, r) => `${formatDate(r.effective_from)} – ${r.effective_to ? formatDate(r.effective_to) : 'ongoing'}`,
    },
    { title: 'Remarks', dataIndex: 'remarks', ellipsis: true, render: (v) => v || '-' },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, r) => (
        <Space>
          {canEdit && (
            <Tooltip title='Edit / end'>
              <Button size='small' color='green' variant='outlined' icon={<EditOutlined />} onClick={() => openEdit(r.id)} />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title='Delete this allowance?'
              description='Only for a wrong entry — to stop it, set Effective To instead.'
              okText='Delete'
              okButtonProps={{ danger: true }}
              onConfirm={() => remove(r)}
            >
              <Tooltip title='Delete'>
                <Button size='small' danger icon={<DeleteOutlined />} />
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
          <Segmented value={filters.state} onChange={(v) => setFilter({ state: v })} options={STATES} />
          <Select
            allowClear
            placeholder='All types'
            value={filters.allowance_type_id}
            onChange={(v) => setFilter({ allowance_type_id: v })}
            options={options.types.map((t) => ({ value: t.id, label: t.name }))}
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 220 }}
          />
          <Select
            allowClear
            placeholder='All branches'
            value={filters.branch_id}
            onChange={(v) => setFilter({ branch_id: v })}
            options={options.branches.map((b) => ({ value: b.id, label: b.name }))}
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 190 }}
          />
          <Input.Search
            placeholder='Employee code or name'
            allowClear
            onSearch={(v) => { setSearch(v.trim()); setPage((p) => ({ ...p, current: 1 })); }}
            style={{ width: 220 }}
          />
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchRows} loading={loading}>Refresh</Button>
          {canTemplate && <Button icon={<DownloadOutlined />} onClick={() => setTemplateOpen(true)}>Generate Template</Button>}
          {canImport && <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>Import</Button>}
          {canCreate && <Button type='primary' icon={<PlusOutlined />} onClick={() => setEditing({})}>Add Allowance</Button>}
        </Space>
      </Space>
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: 1250 }}
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
      <AllowanceFormModal
        open={!!editing}
        allowance={editing?.id ? editing : null}
        options={options}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); fetchRows(); }}
      />
      <GenerateTemplateModal open={templateOpen} types={['allowance']} onClose={() => setTemplateOpen(false)} />
      <ImportDataModal open={importOpen} types={['allowance']} onClose={() => setImportOpen(false)} onImported={fetchRows} />
    </div>
  );
};

export default AllowanceIndex;
