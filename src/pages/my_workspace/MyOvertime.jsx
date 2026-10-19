import { Tag } from 'antd';
import overtimeApi from '../../services/overtime/overtimeApi';
import OvertimeFormModal from '../overtime/OvertimeFormModal';
import OvertimeDetailsModal from '../overtime/OvertimeDetailsModal';
import { TIME_ENTRY_STATUSES, TIME_ENTRY_STATUS_COLORS, timeRange } from '../time_entry/timeEntryHelpers';
import { DAY_TYPE_COLORS, hoursText } from '../overtime/overtimeHelpers';
import { formatDate } from '../../utils/formatDate';
import MyFilingList from './MyFilingList';

// My Workspace → My Overtime: the user's own overtime filings.
const CONFIG = {
  module: 'overtime',
  prefix: 'overtime',
  rowsKey: 'overtimes',
  noun: 'overtime',
  title: 'Overtime',
  statuses: TIME_ENTRY_STATUSES,
  statusColors: TIME_ENTRY_STATUS_COLORS,
  api: overtimeApi,
  FormModal: OvertimeFormModal,
  formProps: (editing) => ({ overtime: editing }),
  DetailsModal: OvertimeDetailsModal,
  detailsIdProp: 'overtimeId',
  columns: [
    { title: 'Date', dataIndex: 'date', width: 120, render: (d) => formatDate(d) },
    { title: 'Time', key: 'time', width: 150, render: (_, r) => timeRange(r.time_from, r.time_to) },
    { title: 'Hours', dataIndex: 'hours', width: 90, align: 'right', render: (h) => hoursText(h) },
    { title: 'Day', dataIndex: 'day_type', width: 200, render: (t) => <Tag color={DAY_TYPE_COLORS[t]}>{t}</Tag> },
    { title: 'Reason', dataIndex: 'reason', ellipsis: true },
  ],
};

const MyOvertime = () => <MyFilingList config={CONFIG} />;

export default MyOvertime;
