import { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Select, Input, Tooltip, Typography, Alert, App } from 'antd';
import { EyeOutlined, ReloadOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import useAuth from '../../../hooks/useAuth';
import dtrApi from '../../../services/payroll/dtrApi';
import handleApiError from '../../../utils/handleApiError';
import { PAGE_SIZE_OPTIONS, showRecordRange } from '../../../utils/tablePagination';
import { cutoffLabel } from '../payrollHelpers';
import { minutesText, daysText } from '../run/runHelpers';
import DtrModal from './DtrModal';
import GenerateTemplateModal from '../../employee_master_data/components/GenerateTemplateModal';
import ImportDataModal from '../../employee_master_data/components/ImportDataModal';

// Timekeeping: every active employee's DTR summary for a payroll cut-off —
// present, absences, leave, late, undertime, overtime and the days that need
// a look — computed from the schedule, biometric punches, approved manual
// time entries, leave and overtime, and holidays (what the payroll run pays
// from). View opens the day-by-day record. Server-side filters / pagination.
// Attendance Template / Import Attendance: time-in / out for employees
// without biometrics (Attendance Logs — Generate Template → Import Data).
const TimekeepingIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const isAdmin = hasRole('Administrator');
  const canTemplate = isAdmin || hasPermission('attendance-log-template-download');
  const canImport = isAdmin || hasPermission('attendance-log-import');
  const [templateOpen, setTemplateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [options, setOptions] = useState({ cutoffs: [], branches: [] });
  const [cutoffId, setCutoffId] = useState(null);
  const [branchId, setBranchId] = useState(undefined);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState({ current: 1, pageSize: 20 });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [cutoff, setCutoff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await dtrApi.options();
        setOptions(data);
        // the cut-off that holds today, else the latest one already started
        const today = new Date().toISOString().slice(0, 10);
        const current = data.cutoffs.find((c) => c.date_from <= today && c.date_to >= today)
          || data.cutoffs.find((c) => c.date_from <= today) || data.cutoffs[0];
        if (current) setCutoffId(current.id);
      } catch (error) {
        handleApiError(error, message);
      }
    };
    load();
  }, [message]);

  const fetchRows = async () => {
    if (!cutoffId) return;
    setLoading(true);
    try {
      const { data } = await dtrApi.getAll({ payroll_cutoff_id: cutoffId, branch_id: branchId, search: search || undefined, page: page.current, per_page: page.pageSize });
      setRows(data.employees.data);
      setTotal(data.employees.total);
      setCutoff(data.cutoff);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchRows(); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cutoffId, branchId, search, page]);

  const resetPage = () => setPage((p) => ({ ...p, current: 1 }));
  const danger = (v, text) => (v ? <Typography.Text type='danger'>{text}</Typography.Text> : <Typography.Text type='secondary'>—</Typography.Text>);

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      fixed: 'left',
      width: 240,
      render: (_, r) => (
        <div>
          <div>{r.full_name}</div>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>{`${r.employee_code} · ${r.branch || '—'}`}</Typography.Text>
        </div>
      ),
    },
    { title: 'Present', key: 'present', width: 85, align: 'right', render: (_, r) => r.summary.present || '—' },
    { title: 'Absent', key: 'absent', width: 80, align: 'right', render: (_, r) => danger(r.summary.absent_days, daysText(r.summary.absent_days)) },
    {
      title: 'Leave',
      key: 'leave',
      width: 80,
      align: 'right',
      render: (_, r) => daysText(r.summary.paid_leave_days + r.summary.unpaid_leave_days),
    },
    { title: 'Late', key: 'late', width: 90, align: 'right', render: (_, r) => danger(r.summary.late_minutes, minutesText(r.summary.late_minutes)) },
    { title: 'Undertime', key: 'ut', width: 100, align: 'right', render: (_, r) => danger(r.summary.undertime_minutes, minutesText(r.summary.undertime_minutes)) },
    { title: 'Overtime', key: 'ot', width: 100, align: 'right', render: (_, r) => minutesText(r.summary.ot_minutes) },
    { title: 'Holidays', key: 'hol', width: 90, align: 'right', render: (_, r) => r.summary.holidays || '—' },
    {
      title: 'Needs a Look',
      key: 'exceptions',
      width: 120,
      render: (_, r) => (r.summary.exceptions ? <Tag color='orange'>{`${r.summary.exceptions} day(s)`}</Tag> : <Typography.Text type='secondary'>—</Typography.Text>),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title='View DTR'>
            <Button color='blue' variant='outlined' size='small' icon={<EyeOutlined />} onClick={() => setViewing({ cutoff, employee: r })} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Select
            value={cutoffId}
            onChange={(v) => { setCutoffId(v); resetPage(); }}
            options={options.cutoffs.map((c) => ({ value: c.id, label: cutoffLabel(c) }))}
            placeholder='Cut-off'
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 260 }}
          />
          <Select
            allowClear
            value={branchId}
            onChange={(v) => { setBranchId(v); resetPage(); }}
            options={options.branches.map((b) => ({ value: b.id, label: b.name }))}
            placeholder='All branches'
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 220 }}
          />
          <Input.Search allowClear placeholder='Code or name' onSearch={(v) => { setSearch(v.trim()); resetPage(); }} style={{ width: 220 }} />
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchRows} loading={loading}>Refresh</Button>
          {canTemplate && <Button icon={<DownloadOutlined />} onClick={() => setTemplateOpen(true)}>Attendance Template</Button>}
          {canImport && <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>Import Attendance</Button>}
        </Space>
      </Space>
      <Alert
        type='info'
        showIcon
        style={{ marginBottom: 12 }}
        title='Computed from the schedule (shifting, Work Schedule or a default schedule), biometric punches (or imported attendance logs), approved manual time entries, leave and overtime, and the branch’s holidays. A holiday not worked is never an absence. Dates from today on count as worked until they pass.'
      />
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: 1100 }}
        pagination={{
          current: page.current,
          pageSize: page.pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZE_OPTIONS.filter((n) => Number(n) <= 50),
          showTotal: showRecordRange,
          onChange: (current, pageSize) => setPage({ current, pageSize }),
        }}
      />
      <DtrModal target={viewing} onClose={() => setViewing(null)} />
      <GenerateTemplateModal open={templateOpen} types={['attendance_log']} onClose={() => setTemplateOpen(false)} />
      <ImportDataModal open={importOpen} types={['attendance_log']} onClose={() => setImportOpen(false)} onImported={fetchRows} />
    </div>
  );
};

export default TimekeepingIndex;
