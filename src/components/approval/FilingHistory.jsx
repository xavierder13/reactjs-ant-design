import dayjs from 'dayjs';
import { Timeline, Tag, Typography } from 'antd';
import { DISPLAY_DATE_FORMAT } from '../../utils/formatDate';

const ACTION_COLORS = { Filed: 'blue', Submitted: 'blue', Approved: 'green', Disapproved: 'red', Cancelled: 'default' };
const DOT_COLORS = { Filed: 'blue', Submitted: 'blue', Approved: 'green', Disapproved: 'red', Cancelled: 'gray' };

const when = (v) => (v ? dayjs(v).format(`${DISPLAY_DATE_FORMAT} hh:mm A`) : '—');

// Everything that happened to a filing (leave, time entry, overtime), oldest
// first: filed, then each approver's decision (`history` from vueportal
// ApprovalProcedure::status — { level, action, name, remarks, acted_at }),
// and a cancellation. A filing decided in one step (no Access Chart levels)
// has no history — its decision comes from the record's acted_* fields.
// `record` = { created_at, filer, status, acted_at, actor, action_remarks };
// `filedLabel` names the first entry ('Submitted' for a payroll run, which
// can be returned and submitted again — entries are shown in time order).
const FilingHistory = ({ record, history = [], filedLabel = 'Filed' }) => {
  const events = [{ action: filedLabel, at: record.created_at, name: record.filer?.name }];
  history.forEach((h) => events.push({ action: h.action, level: h.level, at: h.acted_at, name: h.name, remarks: h.remarks }));
  // the final decision, when the history doesn't already hold it
  if (record.acted_at && ['Approved', 'Disapproved', 'Cancelled'].includes(record.status)
    && !history.some((h) => h.action === record.status)) {
    events.push({ action: record.status, at: record.acted_at, name: record.actor?.name, remarks: record.action_remarks });
  }

  events.sort((a, b) => dayjs(a.at).valueOf() - dayjs(b.at).valueOf());

  return (
    <Timeline
      items={events.map((e, i) => ({
        key: i,
        color: DOT_COLORS[e.action],
        content: (
          <div>
            <Tag color={ACTION_COLORS[e.action]}>{e.action}</Tag>
            {e.level && <Tag>{`Level ${e.level}`}</Tag>}
            <Typography.Text type='secondary'>{`${when(e.at)} · ${e.name || 'System'}`}</Typography.Text>
            {e.remarks && (
              <div style={{ marginTop: 4 }}>
                <Typography.Text type='secondary'>Remarks: </Typography.Text>
                <Typography.Text italic>{e.remarks}</Typography.Text>
              </div>
            )}
          </div>
        ),
      }))}
    />
  );
};

export default FilingHistory;
