import dayjs from 'dayjs';
import { Table, Tag, Tooltip, Typography } from 'antd';
import { DAY_TYPE_COLORS } from '../../overtime/overtimeHelpers';
import { DTR_STATUS_COLORS, minutesText, daysText } from './runHelpers';
import { scheduleSourceLabel } from '../../shift/shiftHelpers';

const empty = <Typography.Text type='secondary'>—</Typography.Text>;

// A cut-off's daily time record, one line per date (DtrService days): the
// schedule used, the day type and holidays, the times in / out (and where
// they came from), the status and the minutes that pay or deduct. Shared by
// the Timekeeping viewer and the payslip.
// Where a time in / out came from: the biometric device, an Attendance Logs
// import, or an approved manual time entry.
const PUNCH_SOURCES = {
  biometric:    { label: 'Bio',      color: 'blue',   title: 'Biometric device (BioBridge)' },
  imported:     { label: 'Imported', color: 'purple', title: 'Attendance Logs import' },
  'time entry': { label: 'Manual',   color: 'orange', title: 'Approved manual time entry' },
};

const PunchSourceTag = ({ source }) => {
  const s = PUNCH_SOURCES[source];
  if (!s) return null;
  return (
    <Tooltip title={s.title}>
      <Tag color={s.color} style={{ marginInlineEnd: 0, fontSize: 11, lineHeight: '16px', paddingInline: 5 }}>{s.label}</Tag>
    </Tooltip>
  );
};

const DtrDaysTable = ({ days }) => {
  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      width: 100,
      fixed: 'left',
      render: (v, d) => (
        <div>
          <div>{dayjs(v).format('MM/DD/YYYY')}</div>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>{d.day}</Typography.Text>
        </div>
      ),
    },
    {
      title: 'Schedule',
      key: 'schedule',
      width: 130,
      render: (_, d) => {
        const s = d.schedule;
        if (!s.source) return <Typography.Text type='warning'>No schedule</Typography.Text>;
        return (
          <div>
            <div>{s.day_off ? 'Day off' : `${s.time_in}–${s.time_out}`}</div>
            <Typography.Text type='secondary' style={{ fontSize: 12, display: 'block' }}>{scheduleSourceLabel(s)}</Typography.Text>
            {s.shift_code && <Typography.Text type='secondary' style={{ fontSize: 12, display: 'block', whiteSpace: 'nowrap' }}>{s.shift_code}</Typography.Text>}
          </div>
        );
      },
    },
    {
      title: 'Day Type',
      dataIndex: 'day_type',
      width: 150,
      render: (v, d) => (
        <div>
          <Tag color={DAY_TYPE_COLORS[v]}>{v}</Tag>
          {d.holidays.map((h) => (
            <div key={h.title} style={{ fontSize: 12, color: '#8c8c8c' }}>{h.title}</div>
          ))}
        </div>
      ),
    },
    {
      title: 'In / Out',
      key: 'times',
      width: 150,
      render: (_, d) => {
        if (!d.time_in && !d.time_out) return empty;
        // each time with where it came from (biometric / imported / manual)
        const line = (label, time, source) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <Typography.Text type='secondary' style={{ fontSize: 11, width: 24 }}>{label}</Typography.Text>
            <span>{time || '—'}</span>
            {time && <PunchSourceTag source={source} />}
          </div>
        );
        return (
          <div>
            {line('In', d.time_in, d.in_source)}
            {line('Out', d.time_out, d.out_source)}
          </div>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 150,
      render: (v, d) => (
        <div>
          <Tag color={DTR_STATUS_COLORS[v]}>{v}</Tag>
          {d.leave && <div style={{ fontSize: 12 }}>{`${d.leave.type}${d.leave.half_day ? ` (${d.leave.half_day})` : ''}${d.leave.paid ? '' : ' · unpaid'}`}</div>}
        </div>
      ),
    },
    { title: 'Worked', dataIndex: 'worked_minutes', width: 85, align: 'right', render: minutesText },
    { title: 'Late', dataIndex: 'late_minutes', width: 75, align: 'right', render: (v) => (v ? <Typography.Text type='danger'>{minutesText(v)}</Typography.Text> : empty) },
    { title: 'Undertime', dataIndex: 'undertime_minutes', width: 90, align: 'right', render: (v) => (v ? <Typography.Text type='danger'>{minutesText(v)}</Typography.Text> : empty) },
    { title: 'Absent', dataIndex: 'absent_days', width: 70, align: 'right', render: (v) => (v ? <Typography.Text type='danger'>{daysText(v)}</Typography.Text> : empty) },
    { title: 'Night', dataIndex: 'night_minutes', width: 70, align: 'right', render: minutesText },
    {
      title: 'Overtime',
      key: 'ot',
      width: 95,
      align: 'right',
      render: (_, d) => (d.overtime.length ? (
        <Tooltip title={d.overtime.map((o) => `${o.from}–${o.to}`).join(', ')}>
          <span>
            {minutesText(d.ot_minutes)}
            {d.ot_night_minutes > 0 && <div style={{ fontSize: 12, color: '#8c8c8c' }}>{`${minutesText(d.ot_night_minutes)} night`}</div>}
          </span>
        </Tooltip>
      ) : empty),
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      render: (v) => (v.length ? v.map((r) => <div key={r} style={{ fontSize: 12 }}>{r}</div>) : empty),
    },
  ];

  return (
    <Table
      rowKey='date'
      size='small'
      bordered
      pagination={false}
      columns={columns}
      dataSource={days}
      // fits a 1440-px screen in the DTR modal; scrolls sideways on smaller ones
      scroll={{ x: 1290, y: 460 }}
      rowClassName={(d) => (d.schedule.day_off || d.holidays.length ? 'dtr-off-day' : '')}
      onRow={(d) => (d.schedule.day_off || d.holidays.length ? { style: { background: 'rgba(0, 0, 0, 0.02)' } } : {})}
    />
  );
};

export default DtrDaysTable;
