import { Table, Typography } from 'antd';
import { hhmm } from './timeEntryHelpers';

const ROWS = [
  { key: 'time_in', label: 'Time In' },
  { key: 'break_out', label: 'Break Out' },
  { key: 'break_in', label: 'Break In' },
  { key: 'time_out', label: 'Time Out' },
];

// Biometric vs filed, in the Attendance tab's structure (Time In → Break Out
// → Break In → Time Out). `punches` = the day's BioBridge reading (null =
// unreachable, [] = none); `filed` = the entry's times; `schedule` = the
// day's schedule line.
const TimeComparison = ({ punches, filed, scheduleLine }) => {
  const unavailable = punches === null || punches === undefined;
  const none = !unavailable && (Array.isArray(punches) || !punches.logs?.length);
  const bio = (k) => {
    if (unavailable) return <Typography.Text type='secondary'>unavailable</Typography.Text>;
    if (none) return '—';
    return hhmm(punches[k]) || '—';
  };
  const columns = [
    { title: '', dataIndex: 'label', width: 110 },
    { title: 'Biometric', key: 'bio', render: (_, r) => bio(r.key) },
    {
      title: 'Filed',
      key: 'filed',
      render: (_, r) => (filed?.[r.key] ? <Typography.Text strong>{hhmm(filed[r.key])}</Typography.Text> : '—'),
    },
  ];

  return (
    <>
      {scheduleLine && <Typography.Paragraph style={{ marginBottom: 6 }}>{scheduleLine}</Typography.Paragraph>}
      <Table rowKey='key' size='small' pagination={false} columns={columns} dataSource={ROWS} />
      {none && <Typography.Text type='secondary'>No biometric punches that day.</Typography.Text>}
      {!unavailable && !none && punches.logs?.length > 0 && (
        <Typography.Paragraph type='secondary' style={{ marginTop: 6, marginBottom: 0, fontSize: 12 }}>
          {`All punches: ${punches.logs.map((l) => `${l.punch} ${l.time}`).join(' · ')}`}
        </Typography.Paragraph>
      )}
    </>
  );
};

export default TimeComparison;
