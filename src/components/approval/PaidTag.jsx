import { Tag, Tooltip } from 'antd';

// An approved leave / time entry / overtime already paid by an approved
// payroll (`paid_in` = its cut-off code, set by the backend). It can't be
// cancelled — a correction goes through a retro adjustment.
const PaidTag = ({ paidIn }) => (paidIn ? (
  <Tooltip title={`Paid in payroll ${paidIn} — it can't be cancelled; correct it with a retro adjustment`}>
    <Tag color='blue'>{`Paid · ${paidIn}`}</Tag>
  </Tooltip>
) : null);

export default PaidTag;
