import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Tag, Button, Space, Tooltip, Popconfirm, Alert, App,
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import clearanceApi from '../../../services/clearance/clearanceApi';
import handleApiError from '../../../utils/handleApiError';

// Clearance Setup → Templates: each a clearance process (components in
// clearing order, each with an in-charge and a checklist) for the branches
// it covers; the default one covers every other branch. Edited on their own
// page (/clearances/templates/:id), like KPI templates.
const ClearanceTemplatesTab = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await clearanceApi.templates();
      setRows(data.templates);
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
  }, []);

  const remove = async (record) => {
    try {
      const { data } = await clearanceApi.deleteTemplate(record.id);
      message.success(data.message);
      fetchRows();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const columns = [
    {
      title: 'Template',
      dataIndex: 'name',
      render: (name, r) => (
        <div>
          <div>{name}</div>
          {r.description && <div style={{ color: '#8c8c8c', fontSize: 12 }}>{r.description}</div>}
        </div>
      ),
    },
    {
      title: 'Used For',
      key: 'branches',
      render: (_, r) => (
        <Space size={[4, 4]} wrap>
          {r.is_default && <Tag color='blue'>Default — every other branch</Tag>}
          {r.branches.map((b) => <Tag key={b.id}>{b.branch?.name}</Tag>)}
          {!r.is_default && !r.branches.length && <Tag color='orange'>No branch — chosen by HR only</Tag>}
        </Space>
      ),
    },
    { title: 'Components', dataIndex: 'components_count', width: 120 },
    { title: 'Status', dataIndex: 'active', width: 100, render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag> },
    {
      title: 'Actions',
      width: 100,
      render: (_, r) => (
        <Space>
          <Tooltip title='Edit'>
            <Button color='green' variant='outlined' icon={<EditOutlined />} size='small' onClick={() => navigate(`/clearances/templates/${r.id}`)} />
          </Tooltip>
          <Popconfirm title={`Delete ${r.name}?`} description='A template used by a clearance can only be deactivated.' onConfirm={() => remove(r)}>
            <Tooltip title='Delete'>
              <Button danger icon={<DeleteOutlined />} size='small' />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Alert
        type='info'
        showIcon
        style={{ marginBottom: 16 }}
        title='A clearance follows its template: the components clear one after another, each by its in-charge. After the last one it goes to final approval on the "Clearance" Access Chart (Approvals → Access Charts).'
      />
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'flex-end' }} wrap>
        <Button icon={<ReloadOutlined />} onClick={fetchRows} loading={loading}>Refresh</Button>
        <Button type='primary' icon={<PlusOutlined />} onClick={() => navigate('/clearances/templates/new')}>Add Template</Button>
      </Space>
      <Table rowKey='id' size='small' columns={columns} dataSource={rows} loading={loading} pagination={false} scroll={{ x: 800 }} />
    </div>
  );
};

export default ClearanceTemplatesTab;
