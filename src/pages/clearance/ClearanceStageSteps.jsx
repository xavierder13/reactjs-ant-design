import dayjs from 'dayjs';
import { Steps } from 'antd';
import { DISPLAY_DATE_FORMAT } from '../../utils/formatDate';

const when = (v) => (v ? dayjs(v).format(DISPLAY_DATE_FORMAT) : '');

// Where a clearance is in its template's process: each component in
// clearing order (who cleared it and when, N/A ones marked), then Final
// Approval (the latest round's approvers) and Cleared.
const ClearanceStageSteps = ({ clearance: c, items, approval }) => {
  const history = approval?.history || [];
  let reset = -1;
  history.forEach((h, i) => { if (h.action !== 'Approved') reset = i; });
  const approved = history.slice(reset + 1).filter((h) => h.action === 'Approved');
  const currentIndex = items.findIndex((i) => i.is_current);
  let current;
  if (c.status === 'In Progress') current = currentIndex;
  else if (c.status === 'Pending') current = items.length;
  else if (c.status === 'Cleared') current = items.length + 1;
  else current = -1;

  return (
    <Steps
      size='small'
      style={{ marginTop: 16 }}
      current={current}
      status={c.status === 'Cancelled' ? 'error' : (c.status === 'Cleared' ? 'finish' : 'process')}
      items={[
        ...items.map((i) => ({
          title: i.department_name,
          status: i.status === 'Cleared' ? 'finish' : (i.status === 'Not Applicable' ? 'wait' : undefined),
          content: i.status === 'Cleared' ? `${i.cleared_by || ''} · ${when(i.cleared_at)}` : (i.status === 'Not Applicable' ? 'N/A' : (i.signatories.length ? i.signatories.join(', ') : 'HR assigns')),
        })),
        { title: 'Final Approval', content: approved.map((h) => h.name).join(', ') || null },
        { title: 'Cleared', content: c.cleared_at ? when(c.cleared_at) : null },
      ]}
    />
  );
};

export default ClearanceStageSteps;
