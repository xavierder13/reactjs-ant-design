import { Tag, Tooltip } from 'antd';

// An approved leave / time entry / overtime locked by a payroll (set by the
// backend): `paidIn` = the approved payroll that paid it (corrected with a
// payroll adjustment), `pendingIn` = a payroll waiting for approval. Only an
// Administrator can cancel it then.
const PaidTag = ({ paidIn, pendingIn }) => {
  if (paidIn) {
    return (
      <Tooltip title={`Paid in payroll ${paidIn} — it can't be cancelled; correct it with a payroll adjustment`}>
        <Tag color='blue'>{`Paid · ${paidIn}`}</Tag>
      </Tooltip>
    );
  }
  if (pendingIn) {
    return (
      <Tooltip title={`In payroll ${pendingIn}, waiting for approval — it can't be cancelled until the payroll is returned`}>
        <Tag color='gold'>{`For approval · ${pendingIn}`}</Tag>
      </Tooltip>
    );
  }
  return null;
};

export default PaidTag;
