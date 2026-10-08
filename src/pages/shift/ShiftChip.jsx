import { Popover, Table, Tag, Typography } from 'antd';
import { DAYS, dayText, hhmm } from './shiftHelpers';

// Hours worked in a day: time in → out (overnight wraps), minus the break.
const workHours = (day) => {
  if (!day || day.is_day_off) return null;
  const tin = hhmm(day.time_in);
  const tout = hhmm(day.time_out);
  if (!tin || !tout) return null;
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  let minutes = toMin(tout) - toMin(tin);
  if (minutes <= 0) minutes += 24 * 60;
  minutes -= Number(day.break_minutes || 0);
  return Math.max(0, minutes) / 60;
};

// A shift code as a clickable chip: click → the shift's weekly breakdown
// (each day's time in / out, break and paid hours; rest days; grace).
// `shift` = { code, name, description?, grace_minutes?, active?, days: [...] }.
const ShiftChip = ({ shift, color = 'blue' }) => {
  if (!shift) return null;
  const days = DAYS.map((name) => shift.days?.find((d) => d.day === name) || { day: name, is_day_off: true });
  const total = days.reduce((sum, d) => sum + (workHours(d) || 0), 0);

  const content = (
    <div style={{ width: 'min(380px, calc(100vw - 48px))' }}>
      {shift.description && (
        <Typography.Paragraph type='secondary' style={{ fontSize: 12, marginBottom: 8 }}>{shift.description}</Typography.Paragraph>
      )}
      <Table
        rowKey='day'
        size='small'
        pagination={false}
        dataSource={days}
        columns={[
          { title: 'Day', dataIndex: 'day', width: 70, render: (v) => v.slice(0, 3) },
          {
            title: 'Time',
            key: 'time',
            render: (_, d) => (d.is_day_off ? <Tag>Rest day</Tag> : dayText(d)),
          },
          { title: 'Break', dataIndex: 'break_minutes', width: 70, align: 'right', render: (v, d) => (d.is_day_off ? '' : `${Number(v || 0)}m`) },
          { title: 'Hours', key: 'hours', width: 60, align: 'right', render: (_, d) => (workHours(d) === null ? '' : workHours(d).toFixed(1)) },
        ]}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={3}>
              <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                {shift.grace_minutes !== undefined && shift.grace_minutes !== null ? `Grace: ${shift.grace_minutes} min` : 'Weekly total'}
              </Typography.Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align='right'><strong>{total.toFixed(1)}</strong></Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </div>
  );

  return (
    <Popover
      trigger='click'
      placement='bottomLeft'
      title={(
        <span>
          {shift.code} — {shift.name}
          {shift.active === false || shift.active === 0 ? <Tag style={{ marginLeft: 8 }}>Inactive</Tag> : null}
        </span>
      )}
      content={content}
    >
      <Tag color={color} style={{ cursor: 'pointer' }} role='button' tabIndex={0}>
        {shift.code}
      </Tag>
    </Popover>
  );
};

export default ShiftChip;
