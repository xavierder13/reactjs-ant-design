import { Tag } from 'antd';

// `active` is a 'Y'/'N' string on companies and departments.
const ActiveTag = ({ active }) => (
  <Tag color={active === 'N' ? 'default' : 'green'}>{active === 'N' ? 'Inactive' : 'Active'}</Tag>
);

export default ActiveTag;
