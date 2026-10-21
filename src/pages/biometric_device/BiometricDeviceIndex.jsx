import { useCallback, useEffect, useMemo, useState } from 'react';
import { Table, Space, Tooltip, Button, Tag, Popconfirm, Select, Typography, Spin, App, theme } from 'antd';
import { EyeOutlined, SyncOutlined, ImportOutlined, CloudDownloadOutlined, CloudSyncOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import useAuth from '../../hooks/useAuth';
import biometricDeviceApi from '../../services/biometric_device/biometricDeviceApi';
import handleApiError from '../../utils/handleApiError';
import RecordToolbar from '../record_management/RecordToolbar';
import RecordRowActions from '../record_management/RecordRowActions';
import ActiveTag from '../record_management/ActiveTag';
import { tablePagination } from '../../utils/tablePagination';
import { PASSIVE_HEADERS } from '../../utils/session';
import ExpandIcon from '../../components/ExpandIcon';
import BiometricDeviceFormModal from './BiometricDeviceFormModal';
import BiometricDeviceLogsModal from './BiometricDeviceLogsModal';
import BiometricPullProgress from './BiometricPullProgress';
import BiometricFeedsPanel from './BiometricFeedsPanel';
import BiometricFetchModal from './BiometricFetchModal';

const STATUS_COLORS = { OK: 'green', Failed: 'red' };

// where a device's punches come from now (BiometricDevice::feed)
const FEEDS = {
  live: { color: 'green', label: 'Live', tip: 'The listener holds a live connection: each punch is saved within seconds.' },
  device: { color: 'blue', label: 'Device pull', tip: 'Pulled at the interval set in Attendance feeds (and Pull now).' },
  biobridge: { color: 'orange', label: 'BioBridge fallback', tip: 'The device feed has a problem (last pull failed, no successful pull for one pull interval + 5 minutes, never pulled or inactive): its missing punches come from BioBridge every 5 minutes.' },
};

const LAST_PULL_FILTERS = [
  { value: 'all', label: 'All devices' },
  { value: 'OK', label: 'Last pull OK' },
  { value: 'Failed', label: 'Last pull failed' },
  { value: 'never', label: 'Never pulled' },
];

const formatDateTime = (v) => (v ? dayjs(v).format('MM/DD/YYYY h:mm A') : '-');

// How long a pull of this device should take: its last pull's read time
// ("… read in 10.7 s, …") + 1 s to save, else 15 s.
const expectedMs = (device) => {
  const m = /read in ([\d.]+) s/.exec(device.last_message || '');
  return m ? (parseFloat(m[1]) + 1) * 1000 : 15000;
};

const FINISHED_SHOWN_MS = 8000; // a finished pull stays on the progress panel this long

// Biometric Devices: the branch ZKTeco devices and their feed (Live on the
// listener, Device pull every 15 minutes, or BioBridge fallback), Pull now,
// Fetch from BioBridge, and the Attendance feeds panel —
// biometric_device_logs, the table the DTR and payroll read.
// The backend only reads from a device (it never punches, clears or
// changes it); a pull reads the device's whole log (about 10 s per 40,000
// records) and saves the new punches. Import from BioBridge adds the
// devices BioBridge pulls. A device with pulled punches can't be deleted —
// set it inactive.
const BiometricDeviceIndex = () => {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { hasPermission, hasRole } = useAuth();
  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('biometric-device-create');
  const canEdit   = isAdmin || hasPermission('biometric-device-edit');
  const canDelete = isAdmin || hasPermission('biometric-device-delete');
  const canPull   = isAdmin || hasPermission('biometric-device-pull');

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pulls, setPulls] = useState({}); // { [id]: { branch, ip, startedAt, expectedMs, status, message, finishedAt } }
  const [now, setNow] = useState(() => Date.now());
  const [feedsKey, setFeedsKey] = useState(0); // reloads the feeds panel after a pull
  const [roundRunning, setRoundRunning] = useState(false); // a Pull all / scheduled round
  const [startingAll, setStartingAll] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [lastPull, setLastPull] = useState('all');
  const [editing, setEditing] = useState(null); // {} = add
  const [viewing, setViewing] = useState(null); // the device whose punches are shown
  const [fetching, setFetching] = useState(null); // the device for Fetch from BioBridge

  // passive = the refresh while a round runs: no spinner, doesn't keep an idle session alive
  const fetchDevices = async (passive = false) => {
    if (!passive) setLoading(true);
    try {
      const { data } = await biometricDeviceApi.getAll(passive ? { headers: PASSIVE_HEADERS } : undefined);
      setDevices(data.devices);
    } catch (error) {
      if (!passive) handleApiError(error, message);
    } finally {
      if (!passive) setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchDevices(); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the rows' Last Pull / Feed follow a running round
  useEffect(() => {
    if (!roundRunning) return undefined;
    const timer = setInterval(() => { fetchDevices(true); }, 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundRunning]);

  const handleRoundFinished = useCallback((round) => {
    message.success(`Pull all finished: ${round.message}`);
    const load = async () => { await fetchDevices(); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  const pullAll = async () => {
    setStartingAll(true);
    try {
      const { data } = await biometricDeviceApi.pullAll();
      message.success(data.message);
      setFeedsKey((k) => k + 1); // the panel picks up the round and follows it
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setStartingAll(false);
    }
  };

  // a row is pulling when this page started its Pull now, or the server says a
  // pull runs on it (Pull all / a scheduled round / another user); waiting =
  // in a running round, not reached yet. Either way its actions are disabled
  // until that device is done.
  const isPulling = (r) => pulls[r.id]?.status === 'running' || !!r.pulling;
  const isWaiting = (r) => !isPulling(r) && !!r.queued;
  const isBusy = (r) => isPulling(r) || isWaiting(r);
  const pullSeconds = (r) => {
    const startedAt = pulls[r.id]?.status === 'running' ? pulls[r.id].startedAt : dayjs(r.pulling_at).valueOf();
    return Math.max(0, Math.floor((now - startedAt) / 1000));
  };
  const anyRunning = Object.values(pulls).some((p) => p.status === 'running') || (roundRunning && devices.some((d) => d.pulling));

  // the elapsed-time tick, only while a pull runs
  useEffect(() => {
    if (!anyRunning) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [anyRunning]);

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase();
    return devices.filter((d) => {
      if (search && !`${d.branch} ${d.ip} ${d.serial_number || ''}`.toLowerCase().includes(search)) return false;
      if (lastPull === 'never') return !d.last_status;
      if (lastPull !== 'all') return d.last_status === lastPull;
      return true;
    });
  }, [devices, searchText, lastPull]);

  // The pull's result replaces the row (a failed pull is recorded on the device too).
  // The progress panel and the row show it while it runs; the result stays
  // on the panel for a few seconds.
  const pull = async (record) => {
    const startedAt = Date.now();
    setNow(startedAt);
    setPulls((p) => ({ ...p, [record.id]: { branch: record.branch, ip: record.ip, startedAt, expectedMs: expectedMs(record), status: 'running' } }));
    const finish = (status, text) => {
      setPulls((p) => ({ ...p, [record.id]: { ...p[record.id], status, message: text, finishedAt: Date.now() } }));
      setFeedsKey((k) => k + 1);
      setTimeout(() => {
        setPulls((p) => {
          if (p[record.id]?.status === 'running') return p; // pulled again meanwhile
          const next = { ...p };
          delete next[record.id];
          return next;
        });
      }, FINISHED_SHOWN_MS);
    };
    try {
      const { data } = await biometricDeviceApi.pull(record.id);
      finish('ok', data.device.last_message);
      message.success(data.message);
      setDevices((list) => list.map((d) => (d.id === record.id ? { ...data.device, logs_count: d.logs_count } : d)));
      fetchDevices();
    } catch (error) {
      // the message starts with the branch, already shown on the panel
      finish('failed', (error.response?.data?.message || 'The pull did not finish.').replace(`${record.branch}: `, ''));
      handleApiError(error, message);
      fetchDevices();
    }
  };

  const importBioBridge = async () => {
    setImporting(true);
    try {
      const { data } = await biometricDeviceApi.importBioBridge();
      message.success(data.message);
      fetchDevices();
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setImporting(false);
    }
  };

  const remove = async (record) => {
    try {
      const { data } = await biometricDeviceApi.delete(record.id);
      message.success(data.message);
      fetchDevices();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const columns = [
    { title: 'Branch', dataIndex: 'branch', width: 200, sorter: (a, b) => a.branch.localeCompare(b.branch), defaultSortOrder: 'ascend' },
    { title: 'IP Address', dataIndex: 'ip', width: 170, render: (v, r) => (r.port === 4370 ? v : `${v}:${r.port}`) },
    { title: 'Serial No.', dataIndex: 'serial_number', width: 150, render: (v) => v || '-' },
    {
      title: 'Feed',
      dataIndex: 'feed',
      width: 160,
      filters: Object.entries(FEEDS).map(([value, f]) => ({ text: f.label, value })),
      onFilter: (value, r) => r.feed === value,
      render: (v) => (FEEDS[v] ? <Tooltip title={FEEDS[v].tip}><Tag color={FEEDS[v].color}>{FEEDS[v].label}</Tag></Tooltip> : '-'),
    },
    {
      title: 'Last Pull',
      dataIndex: 'last_pulled_at',
      width: 230,
      sorter: (a, b) => (a.last_pulled_at || '').localeCompare(b.last_pulled_at || ''),
      render: (v, r) => (isPulling(r) ? (
        <Space size={6}>
          <Spin size='small' />
          <Typography.Text style={{ color: token.colorInfoText }}>Pulling… {pullSeconds(r)} s</Typography.Text>
        </Space>
      ) : isWaiting(r) ? (
        <Tag icon={<ClockCircleOutlined />} color='default'>Waiting in Pull all…</Tag>
      ) : r.last_status ? (
        <Space size={4} wrap>
          <Tag color={STATUS_COLORS[r.last_status]}>{r.last_status}</Tag>
          <span>{formatDateTime(v)}</span>
        </Space>
      ) : <Typography.Text type='secondary'>Never pulled</Typography.Text>),
    },
    { title: 'Newest Punch', dataIndex: 'last_log_at', width: 170, render: (v) => formatDateTime(v) },
    { title: 'Punches', dataIndex: 'logs_count', width: 120, align: 'right', render: (v) => (v || 0).toLocaleString() },
    { title: 'Status', dataIndex: 'active', width: 100, render: (v) => <ActiveTag active={v ? 'Y' : 'N'} /> },
    {
      title: 'Actions',
      width: 180,
      fixed: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title='View punches'>
            <Button color='blue' variant='outlined' size='small' icon={<EyeOutlined />} disabled={!r.logs_count} onClick={() => setViewing(r)} />
          </Tooltip>
          {canPull && (
            <Tooltip title={r.active ? 'Pull now (fetch only)' : 'Inactive — set it active to pull'}>
              <Button
                color='geekblue'
                variant='outlined'
                size='small'
                icon={<SyncOutlined spin={isPulling(r)} />}
                disabled={!r.active || isBusy(r)}
                onClick={() => pull(r)}
              />
            </Tooltip>
          )}
          {canPull && (
            <Tooltip title='Fetch from BioBridge (missing punches only)'>
              <Button color='geekblue' variant='outlined' size='small' icon={<CloudDownloadOutlined />} disabled={isBusy(r)} onClick={() => setFetching(r)} />
            </Tooltip>
          )}
          <RecordRowActions
            canEdit={canEdit && !isBusy(r)}
            canDelete={canDelete && !r.logs_count && !isBusy(r)}
            onEdit={() => setEditing(r)}
            onDelete={() => remove(r)}
            deleteTitle='Delete this device?'
            deleteDescription='Only possible while it has no pulled punches.'
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <BiometricFeedsPanel
        canToggle={isAdmin}
        canCopy={canPull}
        refreshKey={feedsKey}
        onRoundChange={setRoundRunning}
        onRoundFinished={handleRoundFinished}
      />
      <RecordToolbar
        searchPlaceholder='Search branch, IP or serial'
        onSearch={setSearchText}
        onRefresh={fetchDevices}
        loading={loading}
        canCreate={canCreate}
        createLabel='Add Device'
        onCreate={() => setEditing({})}
      />
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Select value={lastPull} onChange={setLastPull} options={LAST_PULL_FILTERS} style={{ width: 180 }} />
        <Space wrap>
        {canPull && (
          <Popconfirm
            title='Pull all devices now?'
            description='Every active device that is not live, 8 at a time, fetch only. It runs in the background; progress shows in Attendance feeds.'
            okText='Pull all'
            onConfirm={pullAll}
          >
            <Button type='primary' ghost icon={<CloudSyncOutlined />} loading={startingAll || roundRunning} disabled={roundRunning}>
              {roundRunning ? 'Pulling all…' : 'Pull all devices'}
            </Button>
          </Popconfirm>
        )}
        {canCreate && (
          <Popconfirm
            title='Import devices from BioBridge?'
            description='Adds the devices BioBridge pulls that are not on this list yet.'
            okText='Import'
            onConfirm={importBioBridge}
          >
            <Button icon={<ImportOutlined />} loading={importing}>Import from BioBridge</Button>
          </Popconfirm>
        )}
        </Space>
      </Space>
      <BiometricPullProgress pulls={pulls} now={now} />
      <Table
        rowKey='id'
        size='small'
        columns={columns.map((c) => ({
          ...c,
          onCell: (r) => (isPulling(r) ? { style: { background: token.colorInfoBg } } : isWaiting(r) ? { style: { background: token.colorBgLayout } } : {}),
        }))}
        dataSource={filtered}
        loading={loading && !devices.length}
        scroll={{ x: 1550 }}
        pagination={tablePagination(20)}
        expandable={{
          expandIcon: (props) => <ExpandIcon {...props} />,
          rowExpandable: (r) => !!(r.last_message || r.remarks),
          expandedRowRender: (r) => (
            <Space orientation='vertical' size={2}>
              {r.last_message && <span><strong>Last pull:</strong> {r.last_message}</span>}
              {r.remarks && <span><strong>Remarks:</strong> {r.remarks}</span>}
            </Space>
          ),
        }}
      />
      <BiometricDeviceLogsModal
        key={viewing?.id ?? 'none'}
        open={!!viewing}
        device={viewing}
        onClose={() => setViewing(null)}
      />
      <BiometricFetchModal
        key={fetching ? `fetch-${fetching.id}` : 'fetch-none'}
        open={!!fetching}
        device={fetching}
        onClose={() => setFetching(null)}
        onDone={() => { setFetching(null); fetchDevices(); setFeedsKey((k) => k + 1); }}
      />
      <BiometricDeviceFormModal
        open={!!editing}
        device={editing?.id ? editing : null}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); fetchDevices(); }}
      />
    </div>
  );
};

export default BiometricDeviceIndex;
