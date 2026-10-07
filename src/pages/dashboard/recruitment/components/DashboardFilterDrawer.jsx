import { Drawer, Select, DatePicker, Button, Space, Typography, Grid, Divider } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { DISPLAY_DATE_FORMAT } from '../../../../utils/formatDate';
import { FILTER_DEFS } from '../filterDefs';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>{label}</Text>
    {children}
  </div>
);

// The Filters button's drawer: the same filters as the top panel
// (DashboardFilters), stacked, so they can be changed without scrolling away
// from the section being read. Changes apply immediately; Done just closes.
export default function DashboardFilterDrawer({
  open, onClose, filters, filterOptions, dateRange, onFiltersChange, onDateRangeChange, onReset, onResetDate,
}) {
  const screens = Grid.useBreakpoint();
  const setFilter = (key, value) => onFiltersChange({ ...filters, [key]: value || '' });
  const activeCount = [...FILTER_DEFS.map((f) => f.key), 'gender'].filter((k) => filters[k]).length;

  return (
    <Drawer
      title='Filters'
      placement='right'
      size={screens.sm ? 380 : '100%'}
      open={open}
      onClose={onClose}
      extra={<Text type='secondary' style={{ fontSize: 12 }}>{activeCount ? `${activeCount} active` : 'None active'}</Text>}
      footer={(
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button icon={<ReloadOutlined />} onClick={onReset}>Reset all</Button>
          <Button type='primary' onClick={onClose}>Done</Button>
        </div>
      )}
    >
      <Field label='Date Range'>
        <RangePicker
          style={{ width: '100%' }}
          format={DISPLAY_DATE_FORMAT}
          value={[dateRange.from ? dayjs(dateRange.from) : null, dateRange.to ? dayjs(dateRange.to) : null]}
          onChange={(dates) => onDateRangeChange({
            from: dates?.[0] ? dates[0].format('YYYY-MM-DD') : '',
            to:   dates?.[1] ? dates[1].format('YYYY-MM-DD') : '',
          })}
        />
        <Space style={{ marginTop: 6 }}>
          <Button size='small' type='link' style={{ padding: 0 }} onClick={onResetDate}>Reset to default (Jan 1 – today)</Button>
        </Space>
      </Field>

      <Divider style={{ margin: '4px 0 16px' }} />

      {FILTER_DEFS.map(({ label, plural, key }) => (
        <Field key={key} label={label}>
          <Select
            allowClear
            placeholder={`All ${plural}`}
            style={{ width: '100%' }}
            options={(filterOptions[key] || []).map((v) => ({ label: v, value: v }))}
            value={filters[key] || undefined}
            onChange={(v) => setFilter(key, v)}
            showSearch={{ optionFilterProp: 'label' }}
          />
        </Field>
      ))}
      <Field label='Gender'>
        <Select
          allowClear
          placeholder='All'
          style={{ width: '100%' }}
          options={[{ label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }]}
          value={filters.gender || undefined}
          onChange={(v) => setFilter('gender', v)}
        />
      </Field>

      <Text type='secondary' style={{ fontSize: 12 }}>
        Filters apply to every tab. Manpower Request sections use the date range, Branch and Position only.
      </Text>
    </Drawer>
  );
}
