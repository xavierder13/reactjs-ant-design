import { Typography } from 'antd';

// One employee in a bulk-pick Transfer (class `employee-transfer`): the code
// and name, with position · branch on a second line, both in full (wrapped,
// not cut off). `error` = shown red (e.g. refused by a bulk preview).
const EmployeeTransferItem = ({ item, error = false }) => (
  <div className='employee-transfer-item' style={error ? { color: '#cf1322' } : undefined}>
    <div>{item.title}</div>
    {item.description && <Typography.Text type='secondary' style={{ fontSize: 12 }}>{item.description}</Typography.Text>}
  </div>
);

export default EmployeeTransferItem;
