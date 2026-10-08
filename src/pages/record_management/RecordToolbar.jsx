import { Button, Input, Space } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';

// Search + Refresh + Create row shared by the record-management list pages
// (same layout as AreaIndex.jsx). Search filters in memory on the page.
const RecordToolbar = ({ searchPlaceholder, onSearch, onRefresh, loading, canCreate, createLabel, onCreate }) => (
  <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
    <Input.Search
      placeholder={searchPlaceholder}
      allowClear
      onChange={(e) => onSearch(e.target.value)}
      style={{ width: 280 }}
    />
    <Space wrap>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>Refresh</Button>
      {canCreate && (
        <Button type='primary' icon={<PlusOutlined />} onClick={onCreate}>{createLabel}</Button>
      )}
    </Space>
  </Space>
);

export default RecordToolbar;
