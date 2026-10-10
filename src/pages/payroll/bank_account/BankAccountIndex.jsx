import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Tag, Button, Space, Tooltip, Select, Input, Popconfirm, Segmented, Typography, App } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import useAuth from '../../../hooks/useAuth';
import bankAccountApi from '../../../services/payroll/bankAccountApi';
import handleApiError from '../../../utils/handleApiError';
import { formatDate } from '../../../utils/formatDate';
import { PAGE_SIZE_OPTIONS, showRecordRange } from '../../../utils/tablePagination';
import { employeeName } from '../payrollHelpers';
import GenerateTemplateModal from '../../employee_master_data/components/GenerateTemplateModal';
import ImportDataModal from '../../employee_master_data/components/ImportDataModal';
import BankAccountFormModal from './BankAccountFormModal';

const STATES = [
  { value: 'current', label: 'Current' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'history', label: 'History' },
  { value: 'missing', label: 'Without account' },
];

// Employee payroll bank accounts by effective date: the bank file credits
// the account in force on the pay date (none = cash / cheque — "Without
// account" lists the active, salaried ones; the bell links here with
// ?state=missing). A new bank = add an account from its date; the earlier
// one stays as history. No approval — saved by permission. Bulk: Generate
// Template → fill effective_from → Import. Server-side filters and paging.
const BankAccountIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const [searchParams] = useSearchParams();
  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('bank-account-create');
  const canEdit   = isAdmin || hasPermission('bank-account-edit');
  const canDelete = isAdmin || hasPermission('bank-account-delete');
  const canTemplate = isAdmin || hasPermission('bank-account-template-download');
  const canImport = isAdmin || hasPermission('bank-account-import');

  const [options, setOptions] = useState({ banks: [], branches: [] });
  const [filters, setFilters] = useState(() => ({
    state: STATES.some((s) => s.value === searchParams.get('state')) ? searchParams.get('state') : 'current',
  }));
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState({ current: 1, pageSize: 20 });
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // {} = add; { forEmployee } = add for one
  const [templateOpen, setTemplateOpen] = useState(false);
  const [importOpen, setImportOpen]     = useState(false);
  const missing = filters.state === 'missing';

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await bankAccountApi.getAll({ ...filters, search: search || undefined, page: page.current, per_page: page.pageSize });
      setRows(data.accounts.data);
      setTotal(data.accounts.total);
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
        const { data } = await bankAccountApi.getOptions();
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
      const { data } = await bankAccountApi.show(id);
      setEditing(data.account);
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const remove = async (record) => {
    try {
      const { data } = await bankAccountApi.delete(record.id);
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
          <div>{employeeName(r)} {!Number(r.active) && <Tag>Inactive</Tag>}</div>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>{r.employee_code} · {r.branch || '-'}</Typography.Text>
        </div>
      ),
    },
    ...(missing ? [
      { title: 'Payroll Account', key: 'none', render: () => <Tag color='orange'>None — paid by cash / cheque</Tag> },
    ] : [
      { title: 'Bank', key: 'bank', width: 200, render: (_, r) => r.bank_name || '-' },
      { title: 'Account No.', dataIndex: 'account_no', width: 170 },
      { title: 'Account Name', dataIndex: 'account_name', width: 220 },
      { title: 'Effective From', dataIndex: 'effective_from', width: 130, render: (v) => formatDate(v) },
      { title: 'Remarks', dataIndex: 'remarks', ellipsis: true, render: (v) => v || '-' },
    ]),
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, r) => (missing ? (
        canCreate && (
          <Tooltip title='Add account'>
            <Button
              size='small'
              color='green'
              variant='outlined'
              icon={<EditOutlined />}
              onClick={() => setEditing({ forEmployee: { value: r.employee_id, label: `${r.employee_code} - ${employeeName(r)}` } })}
            />
          </Tooltip>
        )
      ) : (
        <Space>
          {canEdit && (
            <Tooltip title='Edit'>
              <Button size='small' color='green' variant='outlined' icon={<EditOutlined />} onClick={() => openEdit(r.id)} />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title='Delete this account?'
              description='Only for a wrong entry — for a new bank, add an account from its date instead.'
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
      )),
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Segmented value={filters.state} onChange={(v) => setFilter({ state: v })} options={STATES} />
          {!missing && (
            <Select
              allowClear
              placeholder='All banks'
              value={filters.bank_id}
              onChange={(v) => setFilter({ bank_id: v })}
              options={options.banks.map((b) => ({ value: b.id, label: b.name }))}
              showSearch={{ optionFilterProp: 'label' }}
              style={{ width: 200 }}
            />
          )}
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
          {canCreate && <Button type='primary' icon={<PlusOutlined />} onClick={() => setEditing({})}>Add Account</Button>}
        </Space>
      </Space>
      <Table
        rowKey={(r) => r.id ?? `employee-${r.employee_id}`}
        size='small'
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: missing ? 640 : 1200 }}
        locale={{ emptyText: missing ? 'Every active employee with a salary has a payroll account' : undefined }}
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
      <BankAccountFormModal
        open={!!editing}
        account={editing?.id ? editing : null}
        forEmployee={editing?.forEmployee || null}
        options={options}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); fetchRows(); }}
      />
      <GenerateTemplateModal open={templateOpen} types={['bank_account']} onClose={() => setTemplateOpen(false)} />
      <ImportDataModal open={importOpen} types={['bank_account']} onClose={() => setImportOpen(false)} onImported={fetchRows} />
    </div>
  );
};

export default BankAccountIndex;
