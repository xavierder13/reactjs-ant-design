import { useEffect, useRef, useState } from 'react';
import { Select, Button, Alert, Spin, Space, Segmented, DatePicker, App } from 'antd';
import dayjs from 'dayjs';
import { ReloadOutlined } from '@ant-design/icons';
import myAttendanceApi from '../../../services/payroll/myAttendanceApi';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import { cutoffOptions } from '../payrollHelpers';
import DtrDaysTable from '../run/DtrDaysTable';
import DtrSummary from '../timekeeping/DtrSummary';

// My Attendance (/my-attendance, My Workspace — any signed-in user): the
// daily time record of the employee linked to the account, per cut-off
// (current one first) or for a date range (up to MAX_RANGE_DAYS) — punches, approved leave / time entries / overtime,
// holidays; what the payroll pays from. A missing punch is fixed by filing a
// manual time entry.
// the backend's cap (MyAttendanceController::MAX_RANGE_DAYS)
const MAX_RANGE_DAYS = 93;

const MyAttendanceIndex = () => {
  const { message } = App.useApp();
  const [options, setOptions] = useState(null);
  const [cutoffId, setCutoffId] = useState(null);
  const [mode, setMode] = useState('cutoff'); // 'cutoff' | 'range'
  const [range, setRange] = useState(null);   // [dayjs, dayjs]
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  // the latest request — an earlier cut-off's slower response is dropped
  const requestRef = useRef(0);

  // `id` = a cut-off id, or [from, to] dayjs for a date range
  const fetchDtr = async (id) => {
    if (!id) return;
    const payload = Array.isArray(id)
      ? { date_from: id[0].format('YYYY-MM-DD'), date_to: id[1].format('YYYY-MM-DD') }
      : { payroll_cutoff_id: id };
    const request = ++requestRef.current;
    setLoading(true);
    try {
      const { data: res } = await myAttendanceApi.show(payload);
      if (request === requestRef.current) setData(res);
    } catch (error) {
      if (request !== requestRef.current) return;
      setData(null);
      handleApiError(error, message);
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { data: res } = await myAttendanceApi.getOptions();
        setOptions(res);
        setCutoffId(res.current_id);
        if (res.linked) await fetchDtr(res.current_id);
      } catch (error) {
        handleApiError(error, message);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a date range starts as the chosen cut-off's dates (else this month so far)
  const changeMode = (next) => {
    setMode(next);
    if (next === 'range') {
      const cutoff = options.cutoffs.find((c) => c.id === cutoffId);
      const start = range || (cutoff ? [dayjs(cutoff.date_from), dayjs(cutoff.date_to)] : [dayjs().startOf('month'), dayjs()]);
      setRange(start);
      fetchDtr(start);
    } else {
      fetchDtr(cutoffId);
    }
  };

  if (!options) return <Spin style={{ display: 'block', margin: '48px auto' }} />;

  if (!options.linked) {
    return <Alert type='info' showIcon title='Your account is not linked to an employee record, so there is no attendance to show. Ask HR to link it (User Accounts → Employee).' />;
  }

  return (
    <div>
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Segmented
            value={mode}
            onChange={changeMode}
            options={[{ label: 'Per cut-off', value: 'cutoff' }, { label: 'Date range', value: 'range' }]}
          />
          {mode === 'cutoff' ? (
            <Select
              value={cutoffId}
              onChange={(v) => { setCutoffId(v); fetchDtr(v); }}
              options={cutoffOptions(options.cutoffs)}
              placeholder='Select a cut-off'
              showSearch={{ optionFilterProp: 'label' }}
              style={{ width: 280 }}
            />
          ) : (
            <DatePicker.RangePicker
              value={range}
              onChange={(v) => { setRange(v); if (v?.[0] && v?.[1]) fetchDtr(v); }}
              format={DISPLAY_DATE_FORMAT}
              allowClear={false}
              // up to MAX_RANGE_DAYS days, counting both ends
              disabledDate={(d, { from }) => Boolean(from) && Math.abs(d.diff(from, 'day')) >= MAX_RANGE_DAYS}
            />
          )}
        </Space>
        <Button icon={<ReloadOutlined />} onClick={() => fetchDtr(mode === 'range' ? range : cutoffId)} loading={loading}>Refresh</Button>
      </Space>
      {mode === 'cutoff' && !options.cutoffs.length && <Alert type='info' showIcon title='No payroll cut-offs yet.' />}
      {loading && !data && <Spin style={{ display: 'block', margin: '32px auto' }} />}
      {data && (
        <Spin spinning={loading}>
          <DtrSummary data={data} />
          <Alert
            type='info'
            showIcon
            style={{ marginBottom: 12 }}
            title='A missing or wrong punch? File a time entry (My Workspace → Time Entries). Only approved leave, time entries and overtime count here.'
          />
          <DtrDaysTable days={data.days} />
        </Spin>
      )}
    </div>
  );
};

export default MyAttendanceIndex;
