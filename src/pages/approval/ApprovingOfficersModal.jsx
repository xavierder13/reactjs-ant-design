import { useState } from 'react';
import { Modal, Select, Button, Tag, Popconfirm, Typography, Card, Table, Tooltip, Space, Alert, Progress, App } from 'antd';
import { UserAddOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import accessChartApi from '../../services/approval/accessChartApi';
import handleApiError from '../../utils/handleApiError';
import { levelsOf, levelStatus, userLabel, addOfficers, addResultText } from './approvalHelpers';

// One approval procedure's approving officers, level by level: each level a
// card with its staffing (officers vs approvals needed), the officers as a
// table (remove one — access-chart-delete) and a picker to add several at
// once (access-chart-create). Changes save at once; `onChanged` refreshes
// the list (and this chart, passed back in).
const ApprovingOfficersModal = ({ chart, users, canAdd, canRemove, onClose, onChanged }) => {
  const { message } = App.useApp();
  const [picks, setPicks] = useState({}); // level → [user ids]
  const [busy, setBusy] = useState(null);

  const add = async (level) => {
    const ids = picks[level] || [];
    if (!ids.length) return;
    setBusy(level);
    try {
      const result = await addOfficers(chart.id, ids, level);
      const text = addResultText(result, users);
      if (result.failed.length) message.warning(text, 6);
      else message.success(text);
      setPicks((p) => ({ ...p, [level]: [] }));
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const remove = async (map) => {
    try {
      await accessChartApi.removeApprover(map.id);
      message.success('Approving officer removed.');
      onChanged();
    } catch (err) {
      handleApiError(err, message);
    }
  };

  const levels = levelsOf(chart);
  const officerColumns = (level) => [
    {
      title: 'Officer',
      key: 'name',
      render: (_, m) => (
        <div>
          <div>{m.user?.name || `User #${m.user_id}`}</div>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>{m.user?.email || ''}</Typography.Text>
        </div>
      ),
    },
    { title: 'Branch', key: 'branch', width: 170, render: (_, m) => m.user?.branch?.name || '—' },
    ...(canRemove ? [{
      title: '',
      key: 'remove',
      width: 50,
      render: (_, m) => (
        <Popconfirm
          title={`Remove ${m.user?.name || 'this officer'} from level ${level}?`}
          okButtonProps={{ danger: true }}
          okText='Remove'
          onConfirm={() => remove(m)}
        >
          <Tooltip title='Remove'>
            <Button danger size='small' icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      ),
    }] : []),
  ];

  return (
    <Modal
      open={!!chart}
      title={chart ? `Approving Officers — ${chart.name}` : ''}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
      afterOpenChange={(isOpen) => { if (!isOpen) setPicks({}); }}
      destroyOnHidden
      width={{ xs: '100%', sm: '95%', md: 820 }}
    >
      {chart && !levels.length && (
        <Alert type='info' showIcon title='This procedure has no levels yet — edit it to add levels and the approvals each needs, then assign officers here.' />
      )}
      {chart && levels.map((l) => {
        const { officers, required, short, empty } = levelStatus(chart, l);
        const taken = new Set(officers.map((m) => m.user_id));
        const options = users.filter((u) => !taken.has(u.id)).map((u) => ({ value: u.id, label: userLabel(u) }));
        const pct = required ? Math.min(100, Math.round((officers.length / required) * 100)) : 100;
        return (
          <Card
            key={l.level}
            size='small'
            style={{ marginBottom: 12 }}
            title={(
              <Space size={8} wrap>
                <TeamOutlined />
                <span>{`Level ${l.level}`}</span>
                <Typography.Text type='secondary' style={{ fontWeight: 'normal' }}>
                  {`${required} approval${required === 1 ? '' : 's'} needed · ${officers.length} officer${officers.length === 1 ? '' : 's'}`}
                </Typography.Text>
              </Space>
            )}
            extra={empty
              ? <Tag color='red'>No officers</Tag>
              : short ? <Tag color='orange'>{`${required - officers.length} more needed`}</Tag> : <Tag color='green'>Ready</Tag>}
          >
            <Progress percent={pct} size='small' showInfo={false} status={short ? 'exception' : 'success'} style={{ marginBottom: 8 }} />
            {short && (
              <Typography.Paragraph type='warning' style={{ fontSize: 12, marginBottom: 8 }}>
                {`This level needs ${required} approvals but has ${officers.length} officer${officers.length === 1 ? '' : 's'} — it can only complete with an Administrator. Add ${required - officers.length} more.`}
              </Typography.Paragraph>
            )}
            <Table
              rowKey='id'
              size='small'
              pagination={false}
              columns={officerColumns(l.level)}
              dataSource={officers}
              locale={{ emptyText: 'No approving officers yet' }}
            />
            {canAdd && (
              <Space.Compact style={{ marginTop: 10, width: '100%' }}>
                <Select
                  mode='multiple'
                  maxTagCount='responsive'
                  placeholder={`Add approving officers to level ${l.level} — pick one or more`}
                  value={picks[l.level] || []}
                  onChange={(v) => setPicks((p) => ({ ...p, [l.level]: v }))}
                  options={options}
                  showSearch={{ optionFilterProp: 'label' }}
                  style={{ width: '100%' }}
                />
                <Button
                  type='primary'
                  icon={<UserAddOutlined />}
                  loading={busy === l.level}
                  disabled={!(picks[l.level] || []).length}
                  onClick={() => add(l.level)}
                >
                  {(picks[l.level] || []).length > 1 ? `Add ${(picks[l.level] || []).length}` : 'Add'}
                </Button>
              </Space.Compact>
            )}
          </Card>
        );
      })}
    </Modal>
  );
};

export default ApprovingOfficersModal;
