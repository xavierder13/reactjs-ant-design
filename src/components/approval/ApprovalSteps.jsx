import { Steps, Tag, Space, Typography, Alert } from 'antd';

const STEP_STATUS = { Approved: 'finish', Pending: 'process', Disapproved: 'error', Waiting: 'wait', 'Not reached': 'wait' };
const STATUS_COLORS = { Approved: 'green', Pending: 'gold', Disapproved: 'red', Waiting: 'default', 'Not reached': 'default' };
const ACTION_COLORS = { Approved: 'green', Disapproved: 'red' };

// The Access Chart approval route of a filing (vueportal
// ApprovalProcedure::status): each level's status and progress, who decided
// at it and who it waits for. When and why each decision was made is in
// FilingHistory. An info alert when the filing is decided in one step.
// `approval` = { configured, levels }.
const ApprovalSteps = ({ approval, chartName }) => {
  if (!approval) return null;
  if (!approval.levels.length) {
    return (
      <Alert
        type='info'
        showIcon
        title={approval.configured
          ? 'Filed before the approval procedure was set up — anyone with the approval permission decides it.'
          : `No approval procedure is set up yet (Access Chart "${chartName}") — anyone with the approval permission decides it.`}
      />
    );
  }

  return (
    <Steps
      size='small'
      orientation='vertical'
      items={approval.levels.map((l) => {
        const decided = l.actions.filter((a) => a.action !== 'Cancelled');
        return {
          status: STEP_STATUS[l.status],
          title: (
            <Space size={6} wrap>
              <span>{`Level ${l.level}`}</span>
              <Tag color={STATUS_COLORS[l.status]}>{l.status}</Tag>
              {l.required > 0 && <Typography.Text type='secondary'>{`${l.approved} of ${l.required} approval${l.required === 1 ? '' : 's'}`}</Typography.Text>}
            </Space>
          ),
          content: (
            <Space orientation='vertical' size={4} style={{ paddingBottom: 4 }}>
              {decided.length > 0 && (
                <Space size={[4, 4]} wrap>
                  {decided.map((a) => (
                    <Tag key={`${a.name}-${a.acted_at}`} color={ACTION_COLORS[a.action]}>{`${a.action}: ${a.name || '—'}`}</Tag>
                  ))}
                </Space>
              )}
              {l.status === 'Pending' && (() => {
                // who still has to act at this level (not the ones who already did)
                const acted = new Set(l.actions.map((a) => a.name));
                const waiting = l.approvers.filter((a) => !acted.has(a.name));
                if (waiting.length) return <Typography.Text type='secondary'>{`Waiting for: ${waiting.map((a) => a.name).join(', ')}`}</Typography.Text>;
                return l.approvers.length
                  ? <Typography.Text type='danger'>Every approver of this level has acted — an Administrator can complete it.</Typography.Text>
                  : <Typography.Text type='danger'>No approver covers this employee at this level — an Administrator can approve it.</Typography.Text>;
              })()}
            </Space>
          ),
        };
      })}
    />
  );
};

export default ApprovalSteps;
