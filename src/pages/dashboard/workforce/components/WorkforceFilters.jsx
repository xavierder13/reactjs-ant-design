import { Card, Select, Button, Space, Typography, DatePicker } from 'antd';
import { EMPLOYMENT_TYPE_OPTIONS } from '../../../../utils/employmentTypes';
import { DISPLAY_DATE_FORMAT } from '../../../../utils/formatDate';
import { DATE_FIELD_OPTIONS, NO_FILTERS, toQuery } from './workforceFilterQuery';

const { Text } = Typography;

// Filters for the analytics sections (not the overview cards). `vertical`
// stacks them full width for the Filters drawer (no card, no Reset — the
// drawer has its own).
export default function WorkforceFilters({ filters, options, onChange, vertical = false }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const filtered = Object.keys(toQuery(filters)).length > 0;
  const w = (width) => (vertical ? '100%' : width);
  const fields = (
      <Space wrap={!vertical} orientation={vertical ? 'vertical' : 'horizontal'} size={vertical ? 16 : 8} style={vertical ? { width: '100%' } : undefined} styles={vertical ? { item: { width: '100%' } } : undefined}>
        {!vertical && <Text strong>Filter analytics:</Text>}
        <Select
          allowClear
          placeholder='All branches'
          style={{ width: w(220) }}
          value={filters.branch_id}
          onChange={(v) => set({ branch_id: v })}
          options={options.branches.map((b) => ({ label: b.name, value: b.id }))}
          showSearch={{ optionFilterProp: 'label' }}
        />
        <Select
          allowClear
          placeholder='All departments'
          style={{ width: w(220) }}
          value={filters.department_id}
          onChange={(v) => set({ department_id: v })}
          options={options.departments.map((d) => ({ label: d.name, value: d.id }))}
          showSearch={{ optionFilterProp: 'label' }}
        />
        <Select
          allowClear
          placeholder='All positions'
          style={{ width: w(220) }}
          popupMatchSelectWidth={false}
          value={filters.position_id}
          onChange={(v) => set({ position_id: v })}
          options={(options.positions || []).map((p) => ({ label: p.name, value: p.id }))}
          showSearch={{ optionFilterProp: 'label' }}
        />
        <Select
          allowClear
          placeholder='All employment types'
          style={{ width: w(190) }}
          value={filters.employment_type}
          onChange={(v) => set({ employment_type: v })}
          options={EMPLOYMENT_TYPE_OPTIONS}
        />
        <Space.Compact style={vertical ? { width: '100%' } : undefined}>
          <Select
            style={{ width: vertical ? '45%' : 230 }}
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
            style={vertical ? { width: '55%' } : undefined}
          />
        </Space.Compact>
        {!vertical && filtered && <Button onClick={() => onChange(NO_FILTERS)}>Reset</Button>}
      </Space>
  );
  return vertical ? fields : <Card size='small' style={{ borderRadius: 8 }}>{fields}</Card>;
}
