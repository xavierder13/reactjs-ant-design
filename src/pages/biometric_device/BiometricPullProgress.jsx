import { Card, Progress, Space, Typography, theme } from 'antd';
import { LoadingOutlined, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';

// The pulls running (and just finished) on the Biometric Devices page. The
// device reports no progress while it sends its log, so the bar is an
// estimate from that device's last pull time (`expectedMs`), held at 95%
// until the pull answers. `pulls` = { [id]: { branch, ip, startedAt,
// expectedMs, status 'running'|'ok'|'failed', message, finishedAt } };
// `now` ticks every half second while one runs.
const seconds = (ms) => `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)} s`;

const BiometricPullProgress = ({ pulls, now }) => {
  const { token } = theme.useToken();
  const entries = Object.entries(pulls);
  if (!entries.length) return null;
  const running = entries.filter(([, p]) => p.status === 'running').length;

  return (
    <Card
      size='small'
      style={{ marginBottom: 16, borderColor: token.colorInfoBorder, background: token.colorInfoBg }}
      title={running ? `Pulling ${running} device${running > 1 ? 's' : ''} — fetch only, nothing on the device is changed` : 'Pull finished'}
    >
      <Space orientation='vertical' size={12} style={{ width: '100%' }}>
        {entries.map(([id, p]) => {
          const elapsed = (p.finishedAt || now) - p.startedAt;
          const percent = p.status === 'running' ? Math.min(95, Math.round((elapsed / p.expectedMs) * 100)) : 100;
          const icon = p.status === 'running'
            ? <LoadingOutlined style={{ color: token.colorInfo }} />
            : p.status === 'ok'
              ? <CheckCircleFilled style={{ color: token.colorSuccess }} />
              : <CloseCircleFilled style={{ color: token.colorError }} />;
          const text = p.status === 'running'
            ? `Reading the device log… ${seconds(elapsed)} of about ${seconds(p.expectedMs)}`
            : p.status === 'ok'
              ? `Done in ${seconds(elapsed)} — ${p.message}`
              : `Failed after ${seconds(elapsed)} — ${p.message}`;
          return (
            <div key={id}>
              <Space size={8} wrap>
                {icon}
                <Typography.Text strong>{p.branch}</Typography.Text>
                <Typography.Text type='secondary'>{p.ip}</Typography.Text>
              </Space>
              <Progress
                percent={percent}
                size='small'
                status={p.status === 'running' ? 'active' : p.status === 'ok' ? 'success' : 'exception'}
                showInfo={false}
                style={{ margin: '4px 0 0' }}
              />
              <Typography.Text type={p.status === 'failed' ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                {text}
              </Typography.Text>
            </div>
          );
        })}
        {running > 0 && (
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>
            The bar is an estimate from each device&apos;s last pull; a device sends its whole log every time (about 10 s per 40,000 records).
          </Typography.Text>
        )}
      </Space>
    </Card>
  );
};

export default BiometricPullProgress;
