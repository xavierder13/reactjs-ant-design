import { Space, Tag, Typography } from 'antd';
import { peso } from '../payrollHelpers';

const accountText = (s) => (s ? `${s.bank_code || s.bank_name || 'Bank'} ${s.account_no}` : 'No company account');

// What a payout is / was paid from, per paying account — the backend's
// paid_from_summary [{ key, status: credited | no_account | not_positive,
// source { company_name (null = general), bank_code, account_no }, employees,
// total }]. `compact`: one line of tags (lists); else a line per account.
const PaidFromSummary = ({ summary, compact = false }) => {
  if (!summary?.length) return <Typography.Text type='secondary'>—</Typography.Text>;
  const label = (g) => {
    if (g.status === 'no_account') return 'No bank account (cash / check)';
    if (g.status === 'not_positive') return 'Nothing to credit';
    return `${g.source ? `${g.source.company_name || 'General'} · ` : ''}${accountText(g.source)}`;
  };
  const color = (g) => (g.status === 'credited' ? (g.source ? (g.source.company_name ? 'blue' : 'default') : 'orange') : g.status === 'no_account' ? 'orange' : 'red');

  if (compact) {
    return (
      <Space size={[4, 4]} wrap>
        {summary.map((g) => <Tag key={g.key} color={color(g)} style={{ marginInlineEnd: 0 }}>{`${label(g)} (${g.employees})`}</Tag>)}
      </Space>
    );
  }

  return (
    <Space orientation='vertical' size={2}>
      {summary.map((g) => (
        <span key={g.key}>
          <Tag color={color(g)}>{label(g)}</Tag>
          <Typography.Text type='secondary'>{`${g.employees} employee${g.employees === 1 ? '' : 's'} · ${peso(g.total)}`}</Typography.Text>
        </span>
      ))}
    </Space>
  );
};

export default PaidFromSummary;
