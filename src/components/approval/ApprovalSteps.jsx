import { Steps, Tag, Space, Typography, Alert } from 'antd';
import { formatDate } from '../../utils/formatDate';

const STEP_STATUS = { Approved: 'finish', Pending: 'process', Disapproved: 'error', Waiting: 'wait', 'Not reached': 'wait' };
const ACTION_COLORS = { Approved: 'green', Disapproved: 'red', Cancelled: 'default' };

// The Access Chart approval route of a filing (vueportal
// ApprovalProcedure::status): each level's progress, who acted and who it
// waits for; an info alert when the filing is decided in one step.
// `approval` = { configured, levels, history }.
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

  const cancelled = approval.history.filter((h) => h.action === 'Cancelled');

  return (
    <>
      <Steps
        size='small'
        orientation='vertical'
        items={approval.levels.map((l) => ({
          status: STEP_STATUS[l.status],
          title: `Level ${l.level} — ${l.status}${l.required ? ` (${l.approved}/${l.required})` : ''}`,
          content: (
            <Space orientation='vertical' size={2}>
              {/* a cancellation is listed once, below */}
              {l.actions.filter((a) => a.action !== 'Cancelled').map((a) => (
                <span key={`${a.name}-${a.acted_at}`}>
                  <Tag color={ACTION_COLORS[a.action]}>{a.action}</Tag>
                  {`${a.name || '—'} · ${formatDate(a.acted_at)}`}{a.remarks ? ` — ${a.remarks}` : ''}
                </span>
              ))}
              {l.status === 'Pending' && (
                l.approvers.length
                  ? <Typography.Text type='secondary'>{`Waiting for: ${l.approvers.map((a) => a.name).join(', ')}`}</Typography.Text>
                  : <Typography.Text type='danger'>No approver covers this employee at this level — an Administrator can approve it.</Typography.Text>
              )}
            </Space>
          ),
        }))}
      />
      {cancelled.length > 0 && (
        <Typography.Paragraph type='secondary' style={{ marginTop: 8 }}>
          {cancelled.map((h) => `Cancelled by ${h.name} · ${formatDate(h.acted_at)}`).join('; ')}
        </Typography.Paragraph>
      )}
    </>
  );
};

export default ApprovalSteps;
