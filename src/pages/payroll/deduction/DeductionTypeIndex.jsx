import { useEffect, useMemo, useState } from 'react';
import { Table, Tag, Space, App } from 'antd';
import useAuth from '../../../hooks/useAuth';
import deductionTypeApi from '../../../services/payroll/deductionTypeApi';
import handleApiError from '../../../utils/handleApiError';
import RecordToolbar from '../../record_management/RecordToolbar';
import RecordRowActions from '../../record_management/RecordRowActions';
import ActiveTag from '../../record_management/ActiveTag';
import { tablePagination } from '../../../utils/tablePagination';
import DeductionTypeFormModal from './DeductionTypeFormModal';

const CATEGORY_COLORS = { 'Government Loan': 'blue', 'Company Loan': 'purple', 'Cash Advance': 'gold', Other: 'default' };

// Kinds of payroll deduction. A type in use can't be deleted — set it
// inactive (no new deductions; existing ones keep running).
const DeductionTypeIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('deduction-type-create');
  const canEdit   = isAdmin || hasPermission('deduction-type-edit');
  const canDelete = isAdmin || hasPermission('deduction-type-delete');

  const [types, setTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [editing, setEditing] = useState(null); // {} = create

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const { data } = await deductionTypeApi.getAll();
      setTypes(data.types);
      setCategories(data.categories);
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
    return types.filter((t) => !search || `${t.code} ${t.name} ${t.category}`.toLowerCase().includes(search));
  }, [types, searchText]);

  const remove = async (record) => {
    try {
      const { data } = await deductionTypeApi.delete(record.id);
      message.success(data.message);
      fetchTypes();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', width: 130, sorter: (a, b) => a.code.localeCompare(b.code) },
    {
      title: 'Name',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (v, r) => <Space size={4} wrap>{v}{r.needs_description && <Tag>Needs description</Tag>}</Space>,
    },
    { title: 'Category', dataIndex: 'category', width: 160, render: (v) => <Tag color={CATEGORY_COLORS[v]}>{v}</Tag> },
    { title: 'Deductions', dataIndex: 'deductions_count', width: 110, align: 'right' },
    { title: 'Status', dataIndex: 'active', width: 100, render: (v) => <ActiveTag active={v ? 'Y' : 'N'} /> },
    {
      title: 'Actions',
      width: 100,
      render: (_, r) => (
        <RecordRowActions
          canEdit={canEdit}
          canDelete={canDelete && !r.deductions_count}
          onEdit={() => setEditing(r)}
          onDelete={() => remove(r)}
          deleteTitle='Delete this deduction type?'
          deleteDescription='Only possible while no deduction uses it.'
        />
      ),
    },
  ];

  return (
    <div>
      <RecordToolbar
        searchPlaceholder='Search code, name or category'
        onSearch={setSearchText}
        onRefresh={fetchTypes}
        loading={loading}
        canCreate={canCreate}
        createLabel='Create Deduction Type'
        onCreate={() => setEditing({})}
      />
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={filtered}
        loading={loading}
        scroll={{ x: 760 }}
        pagination={tablePagination(20)}
        expandable={{ rowExpandable: (r) => !!r.remarks, expandedRowRender: (r) => r.remarks }}
      />
      <DeductionTypeFormModal
        open={!!editing}
        type={editing?.id ? editing : null}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); fetchTypes(); }}
      />
    </div>
  );
};

export default DeductionTypeIndex;
