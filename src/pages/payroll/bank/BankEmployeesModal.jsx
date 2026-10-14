import { useEffect, useState } from 'react';
import { Modal, Table, Input, Segmented, Space, Tag, Typography, App } from 'antd';
import bankAccountApi from '../../../services/payroll/bankAccountApi';
import handleApiError from '../../../utils/handleApiError';
import { formatDate } from '../../../utils/formatDate';
import { PAGE_SIZE_OPTIONS, showRecordRange } from '../../../utils/tablePagination';

const STATES = [
  { value: 'current', label: 'In force today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'history', label: 'History' },
];

const NOTES = {
  current: 'Employees whose account in force today is at this bank — the bank file credits these.',
  upcoming: 'Accounts at this bank that take effect after today.',
  history: 'Every account line at this bank, past ones included — the list’s Employees column counts these employees once each.',
};

// The employees with a payroll account at one bank (Banks list → View
// employees) — bank_account/index { bank_id, state, search, page, per_page }
// (bank-account-list: account numbers). Read-only; Payroll → Bank Accounts
// edits them. The parent mounts it with a `key` per bank so it starts fresh.
const BankEmployeesModal = ({ open, bank, onClose }) => {
  const { message } = App.useApp();
  const [state, setState] = useState('current');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState({ current: 1, pageSize: 20 });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !bank) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await bankAccountApi.getAll({ bank_id: bank.id, state, search: search || undefined, page: page.current, per_page: page.pageSize });
        setRows(data.accounts.data);
        setTotal(data.accounts.total);
      } catch (error) {
        handleApiError(error, message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, bank, state, search, page, message]);

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, r) => (
        <div>
          <div>
            {[r.last_name, r.first_name].filter(Boolean).join(', ')}{r.middle_name ? ` ${r.middle_name}` : ''}
            {Number(r.active) !== 1 && <Tag style={{ marginLeft: 6 }}>Inactive</Tag>}
          </div>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>{r.employee_code}</Typography.Text>
        </div>
      ),
    },
    { title: 'Branch', dataIndex: 'branch', width: 170, render: (v) => v || '—' },
    { title: 'Account No.', dataIndex: 'account_no', width: 170 },
    { title: 'Account Name', dataIndex: 'account_name', width: 200, render: (v) => v || '—' },
    { title: 'Effective From', dataIndex: 'effective_from', width: 120, render: (v) => formatDate(v, '—') },
  ];

  return (
    <Modal
      keyboard={false}
      open={open}
      title={bank ? `Employees — ${bank.name} (${bank.code})` : 'Employees'}
      onCancel={onClose}
      footer={null}
      width={{ xs: '100%', sm: '95%', lg: 1000 }}
    >
      <Space orientation='vertical' size={12} style={{ width: '100%' }}>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Segmented
            value={state}
            onChange={(v) => { setState(v); setPage((p) => ({ ...p, current: 1 })); }}
            options={STATES}
          />
          <Input.Search
            allowClear
            placeholder='Code or name'
            onSearch={(v) => { setSearch(v.trim()); setPage((p) => ({ ...p, current: 1 })); }}
            onChange={(e) => { if (!e.target.value) { setSearch(''); setPage((p) => ({ ...p, current: 1 })); } }}
            style={{ width: 260, maxWidth: '100%' }}
          />
        </Space>
        <Typography.Text type='secondary'>{NOTES[state]}</Typography.Text>
        <Table
          rowKey='id'
          size='small'
          columns={columns}
          dataSource={rows}
          loading={loading}
          scroll={{ x: 800, y: '50vh' }}
          locale={{ emptyText: search ? 'No employee matches the search' : 'No employee account at this bank' }}
          pagination={{
            current: page.current,
            pageSize: page.pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: showRecordRange,
            onChange: (current, pageSize) => setPage({ current: pageSize !== page.pageSize ? 1 : current, pageSize }),
          }}
        />
      </Space>
    </Modal>
  );
};

export default BankEmployeesModal;
