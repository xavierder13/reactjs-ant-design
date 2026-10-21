import { useEffect, useState } from 'react';
import { Modal, Table, Tag, DatePicker, Input, Space, Typography, App } from 'antd';
import dayjs from 'dayjs';
import biometricDeviceApi from '../../services/biometric_device/biometricDeviceApi';
import handleApiError from '../../utils/handleApiError';
import { tablePagination } from '../../utils/tablePagination';
import { formatDate } from '../../utils/formatDate';

const HISTORY_FROM = dayjs('2026-01-01'); // biometric_device_logs starts here

const PRESETS = [
  { label: 'Today', value: [dayjs(), dayjs()] },
  { label: 'Last 7 days', value: [dayjs().subtract(6, 'day'), dayjs()] },
  { label: 'This month', value: [dayjs().startOf('month'), dayjs()] },
  { label: 'Since Jan 1, 2026', value: [HISTORY_FROM, dayjs()] },
];

// One device's punches in biometric_device_logs (Source: brought first by the
// device pull or the BioBridge copy), newest first, any date range (default:
// the device's newest punch day), read from the server one page at a time —
// the total is counted there, nothing is cut off — with a search by employee
// code or name. Read-only.
const BiometricDeviceLogsModal = ({ open, device, onClose }) => {
  const { message } = App.useApp();
  const initialDay = device?.last_log_at ? dayjs(device.last_log_at) : dayjs();
  const [range, setRange] = useState([initialDay, initialDay]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !device) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await biometricDeviceApi.logs(device.id, {
          date_from: range[0].format('YYYY-MM-DD'),
          date_to: range[1].format('YYYY-MM-DD'),
          search: search || null,
          page,
          per_page: pageSize,
        });
        setLogs(data.logs);
        setTotal(data.total);
      } catch (error) {
        handleApiError(error, message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, device, range, search, page, pageSize, message]);

  const columns = [
    { title: 'Date', dataIndex: 'timestamp', width: 110, render: (v) => formatDate(v) },
    { title: 'Time', dataIndex: 'timestamp', width: 100, render: (v) => dayjs(v).format('h:mm:ss A') },
    { title: 'Employee Code', dataIndex: 'user_id', width: 140 },
    { title: 'Employee', dataIndex: 'employee_name', render: (v) => v || <Typography.Text type='secondary'>Not in Employee Master Data</Typography.Text> },
    { title: 'Punch', dataIndex: 'punch', width: 90, render: (v) => <Tag color={v === 'IN' ? 'green' : 'orange'}>{v}</Tag> },
    { title: 'Source', dataIndex: 'source', width: 110, render: (v) => (v === 'biobridge' ? 'BioBridge' : 'Device pull') },
  ];

  return (
    <Modal
      keyboard={false}
      open={open}
      title={device ? `Punches — ${device.branch} (${device.ip})` : 'Punches'}
      footer={null}
      onCancel={onClose}
      width={820}
      destroyOnHidden
    >
      <Space wrap style={{ marginBottom: 12 }}>
        <DatePicker.RangePicker
          value={range}
          allowClear={false}
          format='MM/DD/YYYY'
          presets={PRESETS}
          minDate={HISTORY_FROM}
          maxDate={dayjs()}
          onChange={(v) => { if (v) { setRange(v); setPage(1); } }}
        />
        <Input.Search placeholder='Search code or name' allowClear onSearch={(v) => { setSearch(v.trim()); setPage(1); }} style={{ width: 240 }} />
      </Space>
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={logs}
        loading={loading}
        scroll={{ x: 600 }}
        pagination={tablePagination(20, {
          current: page,
          pageSize,
          total,
          onChange: (p, size) => { setPage(size !== pageSize ? 1 : p); setPageSize(size); },
        })}
      />
    </Modal>
  );
};

export default BiometricDeviceLogsModal;
