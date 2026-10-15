import { useEffect, useState } from 'react';
import { Button, Card, Popconfirm, Space, Table, Tabs, Tag, Tooltip, App } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import useAuth from '../../../hooks/useAuth';
import payrollAssistantApi from '../../../services/payroll/payrollAssistantApi';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import PayrollAssistantPanel from '../../../components/payroll_assistant/PayrollAssistantPanel';
import AssistantTopicFormModal from './AssistantTopicFormModal';

// Payroll Assistant page (/payroll-assistant — payroll-assistant): Ask (the
// same assistant as the top-bar "?"); with payroll-assistant-manage, Topics
// (add / edit / delete the how-to topics) and Unanswered (searches that found
// no topic — what to write next).
const PayrollAssistantPage = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const canManage = hasRole('Administrator') || hasPermission('payroll-assistant-manage');
  const [tab, setTab] = useState('ask');
  const [topics, setTopics] = useState([]);
  const [searches, setSearches] = useState([]);
  const [options, setOptions] = useState({ categories: [], checks: [] });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // {} = new
  const [askKey, setAskKey] = useState(0); // remounts Ask after topic changes

  const load = async () => {
    if (!canManage) return;
    setLoading(true);
    try {
      const [t, u, o] = await Promise.all([payrollAssistantApi.topics(), payrollAssistantApi.unanswered(), payrollAssistantApi.options()]);
      setTopics(t.data.topics);
      setSearches(u.data.searches);
      setOptions(o.data);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => { await load(); };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  const remove = async (t) => {
    try {
      const { data } = await payrollAssistantApi.delete(t.id);
      message.success(data.message);
      await load();
      setAskKey((k) => k + 1);
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const topicColumns = [
    { title: 'Title', dataIndex: 'title', render: (v, r) => <span>{v} {!r.active && <Tag>Inactive</Tag>} {r.check && <Tag color='blue'>Check my case</Tag>}</span> },
    { title: 'Category', dataIndex: 'category', width: 190, filters: (options.categories || []).map((c) => ({ text: c, value: c })), onFilter: (v, r) => r.category === v },
    { title: 'Code', dataIndex: 'code', width: 190 },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, r) => (
        <Space>
          <Tooltip title='Edit'><Button size='small' color='green' variant='outlined' icon={<EditOutlined />} onClick={() => setEditing(r)} /></Tooltip>
          <Popconfirm title='Delete this topic?' okText='Delete' okButtonProps={{ danger: true }} onConfirm={() => remove(r)}>
            <Tooltip title='Delete'><Button size='small' danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const searchColumns = [
    { title: 'Asked', dataIndex: 'query' },
    { title: 'Times', dataIndex: 'times', width: 90, align: 'right' },
    { title: 'Last asked', dataIndex: 'last_asked', width: 170, render: (v) => dayjs(v).format(`${DISPLAY_DATE_FORMAT} hh:mm A`) },
  ];

  const items = [
    { key: 'ask', label: 'Ask', children: <Card size='small' style={{ maxWidth: 820 }}><PayrollAssistantPanel key={askKey} /></Card> },
    ...(canManage ? [
      {
        key: 'topics',
        label: `Topics (${topics.length})`,
        children: <Table rowKey='id' size='small' loading={loading} columns={topicColumns} dataSource={topics} pagination={{ pageSize: 20, showSizeChanger: true }} />,
      },
      {
        key: 'unanswered',
        label: `Unanswered (${searches.length})`,
        children: <Table rowKey='query' size='small' loading={loading} columns={searchColumns} dataSource={searches} pagination={{ pageSize: 20 }} locale={{ emptyText: 'Every search in the last 90 days found a topic' }} />,
      },
    ] : []),
  ];

  return (
    <div>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={items}
        tabBarExtraContent={canManage && tab !== 'ask' ? (
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
            <Button type='primary' icon={<PlusOutlined />} onClick={() => setEditing({})}>New Topic</Button>
          </Space>
        ) : null}
      />
      <AssistantTopicFormModal
        open={!!editing}
        topic={editing?.id ? editing : null}
        options={options}
        onClose={() => setEditing(null)}
        onSaved={async () => { setEditing(null); await load(); setAskKey((k) => k + 1); }}
      />
    </div>
  );
};

export default PayrollAssistantPage;
