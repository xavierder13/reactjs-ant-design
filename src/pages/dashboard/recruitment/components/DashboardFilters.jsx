import { Row, Col, Card, Select, Button, DatePicker, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { DISPLAY_DATE_FORMAT } from '../../../../utils/formatDate';
import { FILTER_DEFS } from '../filterDefs';
const { Text } = Typography;
const { RangePicker } = DatePicker;

const labelStyle = { fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 };

// vueportal DashboardFilters.vue — dimension filters + analytics date range.
export default function DashboardFilters({ filters, filterOptions, dateRange, onFiltersChange, onDateRangeChange, onReset, onResetDate }) {
  const setFilter = (key, value) => onFiltersChange({ ...filters, [key]: value || '' });
  return (
    <>
      <Card size='small' style={{ marginBottom: 20, borderRadius: 8 }}>
        <Row gutter={[12, 12]} align='bottom'>
          {FILTER_DEFS.map(({ label, plural, key }) => (
            <Col key={key} xs={12} sm={8} md={4}>
              <Text style={labelStyle}>{label}</Text>
              <Select
                allowClear
                placeholder={`All ${plural}`}
                style={{ width: '100%' }}
                options={(filterOptions[key] || []).map((v) => ({ label: v, value: v }))}
                value={filters[key] || undefined}
                onChange={(v) => setFilter(key, v)}
                showSearch={{ optionFilterProp: 'label' }}
              />
            </Col>
          ))}
          <Col xs={12} sm={8} md={4}>
            <Text style={labelStyle}>Gender</Text>
            <Select
              allowClear
              placeholder='All'
              style={{ width: '100%' }}
              options={[{ label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }]}
              value={filters.gender || undefined}
              onChange={(v) => setFilter('gender', v)}
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Button icon={<ReloadOutlined />} onClick={onReset} block>Reset</Button>
          </Col>
        </Row>
      </Card>

      <Card size='small' style={{ marginBottom: 20, borderRadius: 8 }}>
        <Row align='middle' gutter={[12, 8]}>
          <Col><Text style={{ ...labelStyle, display: 'inline', marginBottom: 0, letterSpacing: 1 }}>Date Range</Text></Col>
          <Col>
            <RangePicker
              size='small'
              format={DISPLAY_DATE_FORMAT}
              value={[dateRange.from ? dayjs(dateRange.from) : null, dateRange.to ? dayjs(dateRange.to) : null]}
              onChange={(dates) => onDateRangeChange({
                from: dates?.[0] ? dates[0].format('YYYY-MM-DD') : '',
                to:   dates?.[1] ? dates[1].format('YYYY-MM-DD') : '',
              })}
            />
          </Col>
          <Col>
            <Button size='small' danger type='text' icon={<ReloadOutlined />} onClick={onResetDate}>Reset to Default</Button>
          </Col>
          <Col>
            <Text type='secondary' style={{ fontSize: 11 }}>
              Showing: <strong>{dateRange.from ? dayjs(dateRange.from).format('MM/DD/YYYY') : 'All time'}</strong>
              {' '}→ <strong>{dateRange.to ? dayjs(dateRange.to).format('MM/DD/YYYY') : 'Today'}</strong>
            </Text>
          </Col>
        </Row>
      </Card>
    </>
  );
}
