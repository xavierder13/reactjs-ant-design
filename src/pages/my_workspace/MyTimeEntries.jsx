import timeEntryApi from '../../services/time_entry/timeEntryApi';
import TimeEntryFormModal from '../time_entry/TimeEntryFormModal';
import TimeEntryDetailsModal from '../time_entry/TimeEntryDetailsModal';
import { TIME_ENTRY_STATUSES, TIME_ENTRY_STATUS_COLORS, timeRange, breakRange } from '../time_entry/timeEntryHelpers';
import { formatDate } from '../../utils/formatDate';
import MyFilingList from './MyFilingList';

// My Workspace → My Time Entries: the user's own manual time-in / out filings.
const CONFIG = {
  module: 'time_entry',
  prefix: 'time-entry',
  rowsKey: 'entries',
  noun: 'time entry',
  title: 'Time Entry',
  statuses: TIME_ENTRY_STATUSES,
  statusColors: TIME_ENTRY_STATUS_COLORS,
  api: timeEntryApi,
  FormModal: TimeEntryFormModal,
  formProps: (editing, data) => ({ entry: editing, types: data?.types || [] }),
  DetailsModal: TimeEntryDetailsModal,
  detailsIdProp: 'entryId',
  columns: [
    { title: 'Date', dataIndex: 'date', width: 120, render: (d) => formatDate(d) },
    {
      title: 'Time',
      key: 'time',
      width: 170,
      render: (_, r) => (
        <div>
          <div>{timeRange(r.time_in, r.time_out)}</div>
          {breakRange(r.break_out, r.break_in) && <div style={{ color: '#8c8c8c', fontSize: 12 }}>{`Break ${breakRange(r.break_out, r.break_in)}`}</div>}
        </div>
      ),
    },
    { title: 'Type', dataIndex: 'entry_type', width: 150 },
    { title: 'Reason', dataIndex: 'reason', ellipsis: true },
  ],
};

const MyTimeEntries = () => <MyFilingList config={CONFIG} />;

export default MyTimeEntries;
