import { useMemo, useState } from 'react';
import { Table, Tag, Alert, Space, Select, Input, Button, Modal, Form, Popconfirm, App } from 'antd';
import { UserAddOutlined, ReloadOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import useAccessCharts from '../../hooks/useAccessCharts';
import accessChartApi from '../../services/approval/accessChartApi';
import handleApiError from '../../utils/handleApiError';
import { tablePagination } from '../../utils/tablePagination';
import { levelsOf, userLabel } from './approvalHelpers';

// Approving Officers — the access charts' approvers seen per person: which
// procedures and levels each user approves (the "what does this person
// approve" view of /access-charts, like Area's HR Heads tab). Assign a user
// to a chart level, or remove one assignment.
const ApprovingOfficerIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items, users, isLoading, error, refetch } = useAccessCharts();
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');
  const [chartFilter, setChartFilter] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const chartId = Form.useWatch('access_chart_id', form);

  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('access-chart-create');
  const canDelete = isAdmin || hasPermission('access-chart-delete');

  // user id → { user, maps: [{ map, chart }] }
  const officers = useMemo(() => {
    const byUser = {};
    items.forEach((chart) => (chart.access_chart_user_maps || []).forEach((map) => {
      const entry = byUser[map.user_id] || (byUser[map.user_id] = { user: map.user || { id: map.user_id }, maps: [] });
      entry.maps.push({ map, chart });
    }));
    const searchLc = search.toLowerCase();
    return Object.values(byUser)
      .filter((o) => !chartFilter || o.maps.some((m) => m.chart.id === chartFilter))
      .filter((o) => !searchLc || userLabel(o.user).toLowerCase().includes(searchLc))
      .sort((a, b) => (a.user.name || '').localeCompare(b.user.name || ''));
  }, [items, search, chartFilter]);

  const removeMap = async (map) => {
    try {
      await accessChartApi.removeApprover(map.id);
      message.success('Assignment removed.');
      refetch();
    } catch (err) {
      handleApiError(err, message);
    }
  };

  const assign = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const { data } = await accessChartApi.addApprover(values);
      if (data.success) {
        message.success('Approving officer assigned.');
        setAssignOpen(false);
        refetch();
      } else {
        form.setFields(Object.entries(data).map(([name, errors]) => ({ name, errors: [].concat(errors) })));
      }
    } catch (err) {
      handleApiError(err, message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Approving Officer',
      key: 'user',
      sorter: (a, b) => (a.user.name || '').localeCompare(b.user.name || ''),
      render: (_, o) => (
        <div>
          <div>{o.user.name || `User #${o.user.id}`}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{[o.user.email, o.user.branch?.name].filter(Boolean).join(' · ')}</div>
        </div>
      ),
    },
    {
      title: 'Approves',
      key: 'maps',
      render: (_, o) => (
        <Space size={[4, 4]} wrap>
          {o.maps.sort((a, b) => a.chart.name.localeCompare(b.chart.name) || a.map.access_level - b.map.access_level).map(({ map, chart }) => {
            const label = `${chart.name} · Level ${map.access_level}`;
            return canDelete ? (
              <Popconfirm key={map.id} title={`Remove ${o.user.name} from ${label}?`} onConfirm={() => removeMap(map)} okButtonProps={{ danger: true }} okText='Remove'>
                <Tag closable onClose={(e) => e.preventDefault()} style={{ cursor: 'pointer' }}>{label}</Tag>
              </Popconfirm>
            ) : <Tag key={map.id}>{label}</Tag>;
          })}
        </Space>
      ),
    },
    { title: 'Count', key: 'count', width: 80, render: (_, o) => o.maps.length },
  ];

  const levelOptions = levelsOf(items.find((c) => c.id === chartId)).map((l) => ({ value: l.level, label: `Level ${l.level}` }));

  return (
    <div>
      {error && <Alert type='error' showIcon title={error} style={{ marginBottom: 16 }} />}
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input.Search placeholder='Search name or e-mail' allowClear onChange={(e) => setSearch(e.target.value)} style={{ width: 240 }} />
          <Select
            allowClear
            placeholder='All procedures'
            value={chartFilter}
            onChange={(v) => setChartFilter(v ?? null)}
            options={items.map((c) => ({ value: c.id, label: c.name }))}
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 240 }}
          />
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={refetch} loading={isLoading}>Refresh</Button>
          {canCreate && (
            <Button type='primary' icon={<UserAddOutlined />} onClick={() => { form.resetFields(); setAssignOpen(true); }}>
              Assign Approving Officer
            </Button>
          )}
        </Space>
      </Space>
      <Table
        rowKey={(o) => o.user.id}
        size='small'
        columns={columns}
        dataSource={officers}
        loading={isLoading}
        scroll={{ x: 700 }}
        pagination={tablePagination(20)}
      />
      <Modal
        open={assignOpen}
        title='Assign Approving Officer'
        okText='Assign'
        onOk={assign}
        confirmLoading={saving}
        onCancel={() => setAssignOpen(false)}
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='user_id' label='User' rules={[{ required: true, message: 'User is required' }]}>
            <Select options={users.map((u) => ({ value: u.id, label: userLabel(u) }))} showSearch={{ optionFilterProp: 'label' }} />
          </Form.Item>
          <Form.Item name='access_chart_id' label='Approval Procedure' rules={[{ required: true, message: 'Procedure is required' }]}>
            <Select
              options={items.map((c) => ({ value: c.id, label: c.name }))}
              showSearch={{ optionFilterProp: 'label' }}
              onChange={() => form.setFieldsValue({ access_level: undefined })}
            />
          </Form.Item>
          <Form.Item name='access_level' label='Level' rules={[{ required: true, message: 'Level is required' }]}>
            <Select options={levelOptions} placeholder={chartId && !levelOptions.length ? 'This chart has no levels' : undefined} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ApprovingOfficerIndex;
