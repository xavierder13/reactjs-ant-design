import { Card, Select, Button, Space, Typography } from 'antd';

const { Text } = Typography;

// Branch / department filter for the analytics sections (not the overview cards).
export default function WorkforceFilters({ filters, options, onChange }) {
  const filtered = !!(filters.branch_id || filters.department_id);
  return (
    <Card size='small' style={{ marginTop: 24, borderRadius: 8 }}>
      <Space wrap>
        <Text strong>Filter analytics:</Text>
        <Select
          allowClear
          placeholder='All branches'
          style={{ width: 240 }}
          value={filters.branch_id}
          onChange={(v) => onChange({ ...filters, branch_id: v })}
          options={options.branches.map((b) => ({ label: b.name, value: b.id }))}
          showSearch={{ optionFilterProp: 'label' }}
        />
        <Select
          allowClear
          placeholder='All departments'
          style={{ width: 240 }}
          value={filters.department_id}
          onChange={(v) => onChange({ ...filters, department_id: v })}
          options={options.departments.map((d) => ({ label: d.name, value: d.id }))}
          showSearch={{ optionFilterProp: 'label' }}
        />
        {filtered && <Button onClick={() => onChange({ branch_id: undefined, department_id: undefined })}>Reset</Button>}
      </Space>
    </Card>
  );
}
