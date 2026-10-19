import { Descriptions, Typography, theme } from 'antd';

// The top of a filing's details modal (leave, manual time entry, overtime):
// who it is for — name, then code · position · branch on their own line, so
// a long position or branch wraps instead of squeezing a column — with the
// status on the right, and the filing's key facts below as label-over-value
// cells (three across on a wide modal, one on a phone).
// `employee` = { employee_code, full_name, position { name }, branch { name } };
// `status` = the status tag(s); `facts` = Descriptions items.
const FilingSummary = ({ employee, status, facts }) => {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        background: token.colorFillQuaternary,
        padding: '12px 16px 4px',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ minWidth: 0, flex: '1 1 260px' }}>
          <Typography.Text strong style={{ fontSize: 15 }}>{employee?.full_name || '—'}</Typography.Text>
          <div style={{ color: token.colorTextSecondary, fontSize: 13, overflowWrap: 'anywhere' }}>
            {[employee?.employee_code, employee?.position?.name, employee?.branch?.name].filter(Boolean).join(' · ') || '—'}
          </div>
        </div>
        <div style={{ flex: '0 0 auto' }}>{status}</div>
      </div>
      <Descriptions size='small' layout='vertical' colon={false} column={{ xs: 1, sm: 3 }} items={facts} />
    </div>
  );
};

export default FilingSummary;
