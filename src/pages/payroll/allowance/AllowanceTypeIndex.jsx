import { useEffect, useMemo, useState } from 'react';
import { Table, Tag, App } from 'antd';
import useAuth from '../../../hooks/useAuth';
import allowanceTypeApi from '../../../services/payroll/allowanceTypeApi';
import handleApiError from '../../../utils/handleApiError';
import RecordToolbar from '../../record_management/RecordToolbar';
import RecordRowActions from '../../record_management/RecordRowActions';
import ActiveTag from '../../record_management/ActiveTag';
import { tablePagination } from '../../../utils/tablePagination';
import { peso } from '../payrollHelpers';
import AllowanceTypeFormModal from './AllowanceTypeFormModal';

// Allowance types and how they are taxed. Seeded with the common ones
// (BIR de minimis limits as of RR 11-2018 — check the latest regulation).
// A type in use can't be deleted — set it inactive.
const AllowanceTypeIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('allowance-type-create');
  const canEdit   = isAdmin || hasPermission('allowance-type-edit');
  const canDelete = isAdmin || hasPermission('allowance-type-delete');

  const [types, setTypes] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [editing, setEditing] = useState(null); // {} = create

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const { data } = await allowanceTypeApi.getAll();
      setTypes(data.types);
      setPeriods(data.periods);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchTypes(); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase();
    return types.filter((t) => !search || `${t.code} ${t.name}`.toLowerCase().includes(search));
  }, [types, searchText]);

  const remove = async (record) => {
    try {
      const { data } = await allowanceTypeApi.delete(record.id);
      message.success(data.message);
      fetchTypes();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', width: 120, sorter: (a, b) => a.code.localeCompare(b.code) },
    { title: 'Name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: 'Tax Treatment',
      key: 'tax',
      width: 260,
      render: (_, r) => {
        if (r.de_minimis) {
          return (
            <span>
              <Tag color='green'>De minimis</Tag>
              {r.de_minimis_limit ? `non-taxable up to ${peso(r.de_minimis_limit)} / ${r.de_minimis_period?.toLowerCase()}` : 'limit per regulation'}
            </span>
          );
        }
        return r.taxable ? <Tag color='orange'>Taxable</Tag> : <Tag color='green'>Non-taxable</Tag>;
      },
    },
    { title: 'Allowances', dataIndex: 'allowances_count', width: 110, align: 'right' },
    { title: 'Status', dataIndex: 'active', width: 100, render: (v) => <ActiveTag active={v ? 'Y' : 'N'} /> },
    {
      title: 'Actions',
      width: 100,
      render: (_, r) => (
        <RecordRowActions
          canEdit={canEdit}
          canDelete={canDelete && !r.allowances_count}
          onEdit={() => setEditing(r)}
          onDelete={() => remove(r)}
          deleteTitle='Delete this allowance type?'
          deleteDescription='Only possible while no allowance uses it.'
        />
      ),
    },
  ];

  return (
    <div>
      <RecordToolbar
        searchPlaceholder='Search code or name'
        onSearch={setSearchText}
        onRefresh={fetchTypes}
        loading={loading}
        canCreate={canCreate}
        createLabel='Create Allowance Type'
        onCreate={() => setEditing({})}
      />
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={filtered}
        loading={loading}
        scroll={{ x: 820 }}
        pagination={tablePagination(20)}
        expandable={{ rowExpandable: (r) => !!r.remarks, expandedRowRender: (r) => r.remarks }}
      />
      <AllowanceTypeFormModal
        open={!!editing}
        type={editing?.id ? editing : null}
        periods={periods}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); fetchTypes(); }}
      />
    </div>
  );
};

export default AllowanceTypeIndex;
