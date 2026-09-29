import { Space, Typography } from 'antd';

const { Text } = Typography;

// Caveats about how the trend is built, plus active employees whose
// resignation date has already passed (counted by the active flag, not by
// the date-rebuilt trend).
export default function DataNotes({ staleActive }) {
  return (
    <Space orientation='vertical' size={2} style={{ marginTop: 12 }}>
      <Text type='secondary' style={{ fontSize: 12 }}>
        Trend figures are rebuilt from hire and resignation dates; the current month is to date, and separations recorded late will raise it.
      </Text>
      {staleActive > 0 && (
        <Text type='secondary' style={{ fontSize: 12 }}>
          {staleActive} active employee{staleActive === 1 ? ' has' : 's have'} a resignation date that has already passed — worth checking in Employee Master Data.
        </Text>
      )}
    </Space>
  );
}
