import { Card, Select, Button, Space, Typography, DatePicker } from 'antd';
import { EMPLOYMENT_TYPE_OPTIONS } from '../../../../utils/employmentTypes';
import { DISPLAY_DATE_FORMAT } from '../../../../utils/formatDate';
import { DATE_FIELD_OPTIONS, NO_FILTERS, toQuery } from './workforceFilterQuery';

const { Text } = Typography;

// Filters for the analytics sections (not the overview cards).
export default function WorkforceFilters({ filters, options, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const filtered = Object.keys(toQuery(filters)).length > 0;
  return (
    <Card size='small' style={{ marginTop: 24, borderRadius: 8 }}>
      <Space wrap>
        <Text strong>Filter analytics:</Text>
        <Select
          allowClear
          placeholder='All branches'
          style={{ width: 220 }}
          value={filters.branch_id}
          onChange={(v) => set({ branch_id: v })}
          options={options.branches.map((b) => ({ label: b.name, value: b.id }))}
          showSearch={{ optionFilterProp: 'label' }}
        />
        <Select
          allowClear
          placeholder='All departments'
          style={{ width: 220 }}
          value={filters.department_id}
          onChange={(v) => set({ department_id: v })}
          options={options.departments.map((d) => ({ label: d.name, value: d.id }))}
          showSearch={{ optionFilterProp: 'label' }}
        />
        <Select
          allowClear
          placeholder='All positions'
          style={{ width: 220 }}
          popupMatchSelectWidth={false}
          value={filters.position_id}
          onChange={(v) => set({ position_id: v })}
          options={(options.positions || []).map((p) => ({ label: p.name, value: p.id }))}
          showSearch={{ optionFilterProp: 'label' }}
        />
        <Select
          allowClear
          placeholder='All employment types'
          style={{ width: 190 }}
          value={filters.employment_type}
          onChange={(v) => set({ employment_type: v })}
          options={EMPLOYMENT_TYPE_OPTIONS}
        />
        <Space.Compact>
          <Select
            style={{ width: 230 }}
            popupMatchSelectWidth={false}
            value={filters.date_field}
            onChange={(v) => set({ date_field: v })}
            options={DATE_FIELD_OPTIONS}
          />
          <DatePicker.RangePicker
            format={DISPLAY_DATE_FORMAT}
            value={filters.date_range}
            onChange={(range) => set({ date_range: range })}
            allowEmpty={[false, false]}
          />
        </Space.Compact>
        {filtered && <Button onClick={() => onChange(NO_FILTERS)}>Reset</Button>}
      </Space>
    </Card>
  );
}
