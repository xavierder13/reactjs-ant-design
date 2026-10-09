import { useMemo, useState } from 'react';
import { Table, Tag, Alert, Space, Select, Input, Button, Modal, Form, Popconfirm, Typography, App } from 'antd';
import { UserAddOutlined, ReloadOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import useAccessCharts from '../../hooks/useAccessCharts';
import accessChartApi from '../../services/approval/accessChartApi';
import handleApiError from '../../utils/handleApiError';
import { tablePagination } from '../../utils/tablePagination';
import { levelsOf, levelStatus, userLabel, addOfficers, addResultText } from './approvalHelpers';

// Approving Officers — the access charts' approvers seen per person: which
// procedures and levels each user approves, grouped by procedure (the "what
// does this person approve" view of /access-charts, like Area's HR Heads
// tab). Assign one or more users to a chart level at once, or remove one
// assignment.
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
  const level = Form.useWatch('access_level', form);

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
      const result = await addOfficers(values.access_chart_id, values.user_ids, values.access_level);
      const text = addResultText(result, users);
      if (result.failed.length) message.warning(text, 6);
      else message.success(text);
      if (result.added) refetch();
      if (!result.failed.length) setAssignOpen(false);
      else form.setFieldsValue({ user_ids: result.failed.map((f) => f.userId) }); // keep the ones not added
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
      title: 'Approves (procedure · level)',
      key: 'maps',
      render: (_, o) => {
        // one line per procedure, its levels as tags (click a tag to remove it)
        const byChart = {};
        o.maps.forEach((m) => { (byChart[m.chart.name] = byChart[m.chart.name] || []).push(m); });
        return (
          <Space orientation='vertical' size={2} style={{ width: '100%' }}>
            {Object.keys(byChart).sort().map((name) => (
              <div key={name} style={{ display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <Typography.Text strong style={{ minWidth: 160 }}>{name}</Typography.Text>
                {byChart[name].sort((a, b) => a.map.access_level - b.map.access_level).map(({ map }) => {
                  const label = `Level ${map.access_level}`;
                  return canDelete ? (
                    <Popconfirm key={map.id} title={`Remove ${o.user.name} from ${name} · ${label}?`} onConfirm={() => removeMap(map)} okButtonProps={{ danger: true }} okText='Remove'>
                      <Tag color='blue' closable onClose={(e) => e.preventDefault()} style={{ cursor: 'pointer', marginInlineEnd: 0 }}>{label}</Tag>
                    </Popconfirm>
                  ) : <Tag key={map.id} color='blue' style={{ marginInlineEnd: 0 }}>{label}</Tag>;
                })}
              </div>
            ))}
          </Space>
        );
      },
    },
    { title: 'Procedures', key: 'count', width: 110, align: 'right', render: (_, o) => new Set(o.maps.map((m) => m.chart.id)).size },
  ];

  const pickedChart = items.find((c) => c.id === chartId);
  const levelOptions = levelsOf(pickedChart).map((l) => ({ value: l.level, label: `Level ${l.level} — ${l.num_of_approvers} approval(s) needed` }));
  const pickedLevel = levelsOf(pickedChart).find((l) => l.level === level);
  const staffing = pickedLevel ? levelStatus(pickedChart, pickedLevel) : null;
  const takenIds = new Set((staffing?.officers || []).map((m) => m.user_id));

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
              Assign Approving Officers
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
        title='Assign Approving Officers'
        okText='Assign'
        onOk={assign}
        confirmLoading={saving}
        onCancel={() => setAssignOpen(false)}
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='access_chart_id' label='Approval Procedure' rules={[{ required: true, message: 'Procedure is required' }]}>
            <Select
              options={items.map((c) => ({ value: c.id, label: c.name }))}
              showSearch={{ optionFilterProp: 'label' }}
              onChange={() => form.setFieldsValue({ access_level: undefined, user_ids: [] })}
            />
          </Form.Item>
          <Form.Item name='access_level' label='Level' rules={[{ required: true, message: 'Level is required' }]}>
            <Select options={levelOptions} placeholder={chartId && !levelOptions.length ? 'This chart has no levels — add them on Access Charts' : undefined} />
          </Form.Item>
          {staffing && (
            <Alert
              type={staffing.short ? 'warning' : 'success'}
              showIcon
              style={{ marginBottom: 12 }}
              title={staffing.officers.length
                ? `Already at this level (${staffing.officers.length} of ${staffing.required} needed): ${staffing.officers.map((m) => m.user?.name || `User #${m.user_id}`).join(', ')}`
                : `No officers at this level yet — it needs ${staffing.required}.`}
            />
          )}
          <Form.Item
            name='user_ids'
            label='Approving Officers'
            extra='Pick one or more — each is added to the level above.'
            rules={[{ required: true, message: 'Pick at least one user' }]}
          >
            <Select
              mode='multiple'
              maxTagCount='responsive'
              options={users.filter((u) => !takenIds.has(u.id)).map((u) => ({ value: u.id, label: userLabel(u) }))}
              showSearch={{ optionFilterProp: 'label' }}
              placeholder={pickedLevel ? 'Search name or e-mail' : 'Choose the procedure and level first'}
              disabled={!pickedLevel}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ApprovingOfficerIndex;
