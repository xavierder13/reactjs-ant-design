import { useEffect, useMemo, useState } from 'react';
import { Table, App } from 'antd';
import useAuth from '../../../hooks/useAuth';
import bankApi from '../../../services/payroll/bankApi';
import handleApiError from '../../../utils/handleApiError';
import RecordToolbar from '../../record_management/RecordToolbar';
import RecordRowActions from '../../record_management/RecordRowActions';
import ActiveTag from '../../record_management/ActiveTag';
import { tablePagination } from '../../../utils/tablePagination';
import BankFormModal from './BankFormModal';

// Banks payroll accounts are held at (employee Bank Accounts and the
// company's own in Payroll Settings). A bank in use can't be deleted — set
// it inactive.
const BankIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('bank-create');
  const canEdit   = isAdmin || hasPermission('bank-edit');
  const canDelete = isAdmin || hasPermission('bank-delete');

  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [editing, setEditing] = useState(null); // {} = create

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const { data } = await bankApi.getAll();
      setBanks(data.banks);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchBanks(); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase();
    return banks.filter((b) => !search || `${b.code} ${b.name}`.toLowerCase().includes(search));
  }, [banks, searchText]);

  const remove = async (record) => {
    try {
      const { data } = await bankApi.delete(record.id);
      message.success(data.message);
      fetchBanks();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', width: 140, sorter: (a, b) => a.code.localeCompare(b.code) },
    { title: 'Name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Employees', dataIndex: 'employees_count', width: 110, align: 'right' },
    { title: 'Status', dataIndex: 'active', width: 100, render: (v) => <ActiveTag active={v ? 'Y' : 'N'} /> },
    {
      title: 'Actions',
      width: 100,
      render: (_, r) => (
        <RecordRowActions
          canEdit={canEdit}
          canDelete={canDelete && !r.employees_count}
          onEdit={() => setEditing(r)}
          onDelete={() => remove(r)}
          deleteTitle='Delete this bank?'
          deleteDescription='Only possible while no account uses it.'
        />
      ),
    },
  ];

  return (
    <div>
      <RecordToolbar
        searchPlaceholder='Search code or name'
        onSearch={setSearchText}
        onRefresh={fetchBanks}
        loading={loading}
        canCreate={canCreate}
        createLabel='Create Bank'
        onCreate={() => setEditing({})}
      />
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={filtered}
        loading={loading}
        scroll={{ x: 640 }}
        pagination={tablePagination(20)}
        expandable={{ rowExpandable: (r) => !!r.remarks, expandedRowRender: (r) => r.remarks }}
      />
      <BankFormModal
        open={!!editing}
        bank={editing?.id ? editing : null}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); fetchBanks(); }}
      />
    </div>
  );
};

export default BankIndex;
