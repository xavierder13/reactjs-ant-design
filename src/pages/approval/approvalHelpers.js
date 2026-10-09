import accessChartApi from '../../services/approval/accessChartApi';

// Charts the HRIS modules look up by name — deleting or renaming one stops
// that module's approvals, so the pages don't offer it.
export const SYSTEM_CHARTS = [
  'Manpower Request', 'MRF - Replacement', 'MRF - Additional', 'MRF - New Position',
  'Leave Application', 'Manual Time Entry', 'Overtime', 'Payroll Run', '13th Month Pay',
];

export const isSystemChart = (chart) => SYSTEM_CHARTS.includes(chart?.name);

export const levelsOf = (chart) => [...(chart?.approver_per_level || [])]
  .sort((a, b) => a.level - b.level)
  .filter((l, i, all) => all.findIndex((x) => x.level === l.level) === i);

export const approversAt = (chart, level) => (chart?.access_chart_user_maps || [])
  .filter((m) => Number(m.access_level) === Number(level));

export const userLabel = (u) => (u ? `${u.name}${u.email ? ` (${u.email})` : ''}` : '—');

// A level's staffing: its officers, the approvals it needs, and whether it
// has fewer officers than that (it can never complete without an
// Administrator).
export const levelStatus = (chart, l) => {
  const officers = approversAt(chart, l.level);
  const required = Number(l.num_of_approvers) || 0;
  return { officers, required, short: officers.length < required, empty: officers.length === 0 };
};

// Adds several users to one chart level, one request each (the backend adds
// one at a time). → { added, failed: [{ userId, reason }] }.
export const addOfficers = async (chartId, userIds, level) => {
  let added = 0;
  const failed = [];
  for (const userId of userIds) {
    try {
      const { data } = await accessChartApi.addApprover({ access_chart_id: chartId, user_id: userId, access_level: level });
      if (data.success) added += 1;
      else failed.push({ userId, reason: [].concat(Object.values(data)[0])[0] });
    } catch (err) {
      failed.push({ userId, reason: err.response?.data?.message || 'Could not be added' });
    }
  }
  return { added, failed };
};

// "2 added; Juan Dela Cruz: already an approver at this level" for a toast.
export const addResultText = (result, users) => {
  const name = (id) => users.find((u) => u.id === id)?.name || `User #${id}`;
  const parts = [];
  if (result.added) parts.push(`${result.added} approving officer(s) added`);
  result.failed.forEach((f) => parts.push(`${name(f.userId)}: ${f.reason}`));
  return parts.join('; ');
};
