import { useEffect, useState } from 'react';
import { Select, Button, Alert, Spin, Space, App } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import myAttendanceApi from '../../../services/payroll/myAttendanceApi';
import handleApiError from '../../../utils/handleApiError';
import { cutoffOptions } from '../payrollHelpers';
import DtrDaysTable from '../run/DtrDaysTable';
import DtrSummary from '../timekeeping/DtrSummary';

// My Attendance (/my-attendance, My Workspace — any signed-in user): the
// daily time record of the employee linked to the account, per cut-off
// (current one first) — punches, approved leave / time entries / overtime,
// holidays; what the payroll pays from. A missing punch is fixed by filing a
// manual time entry.
const MyAttendanceIndex = () => {
  const { message } = App.useApp();
  const [options, setOptions] = useState(null);
  const [cutoffId, setCutoffId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDtr = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await myAttendanceApi.show({ payroll_cutoff_id: id });
      setData(res);
    } catch (error) {
      setData(null);
      handleApiError(error, message);
    } finally {
      setLoading(false);
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

  if (!options) return <Spin style={{ display: 'block', margin: '48px auto' }} />;

  if (!options.linked) {
    return <Alert type='info' showIcon title='Your account is not linked to an employee record, so there is no attendance to show. Ask HR to link it (User Accounts → Employee).' />;
  }

  return (
    <div>
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Select
          value={cutoffId}
          onChange={(v) => { setCutoffId(v); fetchDtr(v); }}
          options={cutoffOptions(options.cutoffs)}
          placeholder='Select a cut-off'
          showSearch={{ optionFilterProp: 'label' }}
          style={{ width: 280 }}
        />
        <Button icon={<ReloadOutlined />} onClick={() => fetchDtr(cutoffId)} loading={loading}>Refresh</Button>
      </Space>
      {!options.cutoffs.length && <Alert type='info' showIcon title='No payroll cut-offs yet.' />}
      {loading && !data && <Spin style={{ display: 'block', margin: '32px auto' }} />}
      {data && (
        <Spin spinning={loading}>
          <DtrSummary data={data} />
          <Alert
            type='info'
            showIcon
            style={{ marginBottom: 12 }}
            title='A missing or wrong punch? File a Manual Time Entry (Time & Leave → Manual Time Entries). Only approved leave, time entries and overtime count here.'
          />
          <DtrDaysTable days={data.days} />
        </Spin>
      )}
    </div>
  );
};

export default MyAttendanceIndex;
