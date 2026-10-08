import { useState } from 'react';
import { Modal, Space, Select, Button, Tag, Popconfirm, Typography, Divider, App } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import accessChartApi from '../../services/approval/accessChartApi';
import handleApiError from '../../utils/handleApiError';
import { levelsOf, approversAt, userLabel } from './approvalHelpers';

// One approval procedure's approving officers, level by level: remove one
// (access-chart-delete) or add one (access-chart-create). Changes save at
// once; `onChanged` refreshes the list (and this chart, passed back in).
const ApprovingOfficersModal = ({ chart, users, canAdd, canRemove, onClose, onChanged }) => {
  const { message } = App.useApp();
  const [picks, setPicks] = useState({}); // level → user id
  const [busy, setBusy] = useState(null);

  const add = async (level) => {
    if (!picks[level]) return;
    setBusy(level);
    try {
      const { data } = await accessChartApi.addApprover({ access_chart_id: chart.id, user_id: picks[level], access_level: level });
      if (data.success) {
        message.success('Approving officer added.');
        setPicks((p) => ({ ...p, [level]: undefined }));
        onChanged();
      } else {
        message.error([].concat(Object.values(data)[0])[0]);
      }
    } catch (err) {
      handleApiError(err, message);
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
  const userOptions = users.map((u) => ({ value: u.id, label: userLabel(u) }));
  const officerText = (m) => `${m.user?.name || `User #${m.user_id}`}${m.user?.branch ? ` · ${m.user.branch.name}` : ''}`;

  return (
    <Modal
      open={!!chart}
      title={chart ? `Approving Officers — ${chart.name}` : ''}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
      afterOpenChange={(isOpen) => { if (!isOpen) setPicks({}); }}
      destroyOnHidden
      width={640}
    >
      {chart && !levels.length && (
        <Typography.Text type='secondary'>This procedure has no levels — edit it to add levels first.</Typography.Text>
      )}
      {chart && levels.map((l, i) => {
        const officers = approversAt(chart, l.level);
        return (
          <div key={l.level}>
            {i > 0 && <Divider style={{ margin: '12px 0' }} />}
            <Space wrap size={6}>
              <Typography.Text strong>{`Level ${l.level}`}</Typography.Text>
              <Typography.Text type='secondary'>{`${l.num_of_approvers} approval(s) needed · ${officers.length} officer(s)`}</Typography.Text>
              {officers.length < l.num_of_approvers && <Tag color='orange'>Fewer officers than approvals needed</Tag>}
            </Space>
            <div style={{ marginTop: 6 }}>
              <Space size={[4, 4]} wrap>
                {officers.map((m) => (canRemove ? (
                  <Popconfirm key={m.id} title={`Remove ${m.user?.name} from level ${l.level}?`} onConfirm={() => remove(m)} okButtonProps={{ danger: true }} okText='Remove'>
                    <Tag closable onClose={(e) => e.preventDefault()} style={{ cursor: 'pointer' }}>{officerText(m)}</Tag>
                  </Popconfirm>
                ) : <Tag key={m.id}>{officerText(m)}</Tag>))}
                {!officers.length && <Typography.Text type='secondary'>No approving officers</Typography.Text>}
              </Space>
            </div>
            {canAdd && (
              <Space.Compact style={{ marginTop: 8, width: '100%' }}>
                <Select
                  placeholder={`Add an approving officer to level ${l.level}`}
                  value={picks[l.level]}
                  onChange={(v) => setPicks((p) => ({ ...p, [l.level]: v }))}
                  options={userOptions.filter((o) => !officers.some((m) => m.user_id === o.value))}
                  showSearch={{ optionFilterProp: 'label' }}
                  style={{ width: '100%' }}
                />
                <Button icon={<UserAddOutlined />} loading={busy === l.level} disabled={!picks[l.level]} onClick={() => add(l.level)}>Add</Button>
              </Space.Compact>
            )}
          </div>
        );
      })}
    </Modal>
  );
};

export default ApprovingOfficersModal;
