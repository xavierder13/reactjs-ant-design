import { Badge, Segmented } from 'antd';

// The For My Approval / All switch of an approval document's list (leave,
// manual time entries, overtime). `count` = what waits for this user's
// decision now (the list's own scope=for_approval total, no filters) —
// shown like the header bell's count; nothing when 0.
const ApprovalViewToggle = ({ value, onChange, count }) => (
  <Segmented
    value={value}
    onChange={onChange}
    options={[
      {
        value: 'approval',
        label: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            For My Approval
            <Badge count={count} size='small' overflowCount={99} />
          </span>
        ),
      },
      { value: 'all', label: 'All' },
    ]}
  />
);

export default ApprovalViewToggle;
