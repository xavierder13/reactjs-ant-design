import { useMemo, useState } from 'react';
import { Table, App } from 'antd';
import useAuth from '../../../hooks/useAuth';
import usePromodizerBrands from '../../../hooks/usePromodizerBrands';
import promodizerBrandApi from '../../../services/record_management/promodizerBrandApi';
import handleApiError from '../../../utils/handleApiError';
import RecordToolbar from '../RecordToolbar';
import RecordRowActions from '../RecordRowActions';
import PromodizerBrandFormModal from './PromodizerBrandFormModal';

// Promodizer Brand maintenance — replaces vueportal's promodizer_brand/PromodizerBrandIndex.vue.
const PromodizerBrandIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items, isLoading, refetch } = usePromodizerBrands();

  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);

  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('promodizer-brand-create');
  const canEdit   = isAdmin || hasPermission('promodizer-brand-edit');
  const canDelete = isAdmin || hasPermission('promodizer-brand-delete');

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase();
    return items.filter((brand) => !search || brand.brand.toLowerCase().includes(search));
  }, [items, searchText]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (record) => { setEditing(record); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };
  const handleSaved = () => { closeModal(); refetch(); };

  const handleDelete = async (id) => {
    try {
      const { data } = await promodizerBrandApi.delete(id);
      message.success(data.success);
      refetch();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const columns = [
    { title: 'Brand', dataIndex: 'brand', sorter: (a, b) => a.brand.localeCompare(b.brand) },
    {
      title: 'Actions',
      width: 100,
      render: (_, record) => (
        <RecordRowActions
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={() => openEdit(record)}
          onDelete={() => handleDelete(record.id)}
          deleteTitle='Delete this brand?'
          deleteDescription='Employees with this promodizer brand will show no brand.'
        />
      ),
    },
  ];

  return (
    <div>
      <RecordToolbar
        searchPlaceholder='Search brand'
        onSearch={setSearchText}
        onRefresh={refetch}
        loading={isLoading}
        canCreate={canCreate}
        createLabel='Create Brand'
        onCreate={openCreate}
      />
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />
      <PromodizerBrandFormModal open={modalOpen} brand={editing} onClose={closeModal} onSaved={handleSaved} />
    </div>
  );
};

export default PromodizerBrandIndex;
