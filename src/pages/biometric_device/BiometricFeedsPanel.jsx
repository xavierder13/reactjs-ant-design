import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Row, Col, Switch, Button, Tag, Space, Typography, Alert, Select, Progress, App } from 'antd';
import { CloudDownloadOutlined, DatabaseOutlined, ApiOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import biometricDeviceApi from '../../services/biometric_device/biometricDeviceApi';
import handleApiError from '../../utils/handleApiError';
import { PASSIVE_HEADERS } from '../../utils/session';

const STATUS_COLORS = { OK: 'green', Failed: 'red', Running: 'blue' };
const when = (v) => (v ? dayjs(v).format('MM/DD/YYYY h:mm A') : '-');
const count = (v) => (v || 0).toLocaleString();

// One pull round downloads every non-live device's whole log (about 1.5 MB
// each): the branch-network traffic per hour for `devices` devices.
const trafficPerHour = (minutes, devices) => {
  const mb = (60 / minutes) * devices * 1.5;
  return mb >= 1000 ? `~${(mb / 1000).toFixed(1)} GB/hour` : `~${Math.round(mb)} MB/hour`;
};

// The feeds of biometric_device_logs — the one table the DTR, payroll and
// the attendance screens read (from Jan 1, 2026): the devices (the listener
// live, else a pull every few minutes — the interval is Administrator only,
// canToggle) and the BioBridge fallback, which
// every 5 minutes copies only the missing punches of devices whose own feed
// has a problem (on / off is Administrator only — canToggle; Copy now needs
// biometric-device-pull — canCopy). `refreshKey` reloads it after a pull.
const ROUND_POLL_MS = 3000;
const IDLE_POLL_MS = 15000;

const BiometricFeedsPanel = ({ canToggle, canCopy, refreshKey, onRoundChange, onRoundFinished }) => {
  const { message, modal } = App.useApp();
  const [feeds, setFeeds] = useState(null);
  const [copying, setCopying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingInterval, setSavingInterval] = useState(false);

  // passive = the round progress poll: doesn't keep an idle session alive
  const load = useCallback(async (passive = false) => {
    try {
      const { data } = await biometricDeviceApi.getFeeds(passive ? { headers: PASSIVE_HEADERS } : undefined);
      setFeeds(data.feeds);
    } catch (error) {
      if (!passive) handleApiError(error, message);
    }
  }, [message]);

  // a pull round (Pull all or scheduled) running: follow its progress, and
  // tell the page when it starts / ends
  const running = !!feeds?.pull?.round?.running;
  const wasRunning = useRef(false);
  // passive checks: fast while a round runs, slower when idle so a scheduled
  // round or another user's Pull all shows up without a reload
  useEffect(() => {
    const timer = setInterval(() => { load(true); }, running ? ROUND_POLL_MS : IDLE_POLL_MS);
    return () => clearInterval(timer);
  }, [running, load]);
  useEffect(() => {
    if (!feeds) return;
    if (wasRunning.current && !running) onRoundFinished?.(feeds.pull.round);
    wasRunning.current = running;
    onRoundChange?.(running);
  }, [running, feeds, onRoundChange, onRoundFinished]);

  useEffect(() => {
    const run = async () => { await load(); };
    run();
  }, [load, refreshKey]);

  const toggle = (enabled) => {
    modal.confirm({
      keyboard: false,
      title: enabled ? 'Turn the BioBridge feed on?' : 'Turn the BioBridge feed off?',
      content: enabled
        ? 'Every 5 minutes, devices whose own feed has a problem get their missing punches from BioBridge again (BioBridge is only read).'
        : 'Devices whose own feed has a problem will get no punches until it works again. Turn it off only when BioBridge is retired.',
      okText: enabled ? 'Turn on' : 'Turn off',
      okButtonProps: { danger: !enabled },
      onOk: async () => {
        setSaving(true);
        try {
          const { data } = await biometricDeviceApi.updateFeeds({ biobridge_copy_enabled: enabled });
          message.success(data.message);
          await load();
        } catch (error) {
          handleApiError(error, message);
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const changeInterval = async (minutes) => {
    setSavingInterval(true);
    try {
      const { data } = await biometricDeviceApi.updateFeeds({ pull_interval_minutes: minutes });
      message.success(data.message);
      await load();
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSavingInterval(false);
    }
  };

  const copyNow = async () => {
    setCopying(true);
    try {
      const { data } = await biometricDeviceApi.copyNow();
      message.success(data.message);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setCopying(false);
      load();
    }
  };

  if (!feeds) return null;
  const { biobridge: bb, device, pull } = feeds;
  const pulledDevices = Math.max(1, device.active - device.live);
  const round = pull.round || {};
  const roundPercent = round.total ? Math.min(100, Math.round((round.done / round.total) * 100)) : 0;

  return (
    <Card
      size='small'
      style={{ marginBottom: 16 }}
      title={<Space><DatabaseOutlined />Attendance feeds</Space>}
      extra={<Typography.Text type='secondary' style={{ fontSize: 12 }}>DTR, payroll and attendance screens read one table: devices first, BioBridge only as fallback</Typography.Text>}
    >
      {!feeds.table_ready && (
        <Alert
          type='info'
          showIcon
          style={{ marginBottom: 12 }}
          title='The first BioBridge copy has not finished — attendance is still read from BioBridge directly.'
        />
      )}
      {!bb.enabled && device.fallback > 0 && (
        <Alert
          type='warning'
          showIcon
          style={{ marginBottom: 12 }}
          title={`The BioBridge fallback is off — ${device.fallback} device${device.fallback > 1 ? 's' : ''} with a feed problem get no new punches until they are pulled again.`}
        />
      )}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Space orientation='vertical' size={4} style={{ width: '100%' }}>
            <Space wrap>
              <ApiOutlined />
              <Typography.Text strong>BioBridge fallback</Typography.Text>
              {canToggle
                ? <Switch size='small' checked={bb.enabled} loading={saving} onChange={toggle} />
                : <Tag color={bb.enabled ? 'green' : 'default'}>{bb.enabled ? 'On' : 'Off'}</Tag>}
              {bb.status && <Tag color={STATUS_COLORS[bb.status]}>{bb.status}</Tag>}
              {canCopy && bb.enabled && (
                <Button size='small' icon={<CloudDownloadOutlined />} loading={copying} onClick={copyNow}>Copy now</Button>
              )}
            </Space>
            <Typography.Text type='secondary' style={{ fontSize: 12 }}>
              Every 5 minutes, only devices on fallback · last run {when(bb.copied_at)}{bb.message ? ` — ${bb.message}` : ''}
            </Typography.Text>
            <Typography.Text style={{ fontSize: 12 }}>
              {count(bb.punches)} punches copied · newest {when(bb.newest)}
            </Typography.Text>
          </Space>
        </Col>
        <Col xs={24} md={12}>
          <Space orientation='vertical' size={4} style={{ width: '100%' }}>
            <Space wrap>
              <CloudDownloadOutlined />
              <Typography.Text strong>Devices</Typography.Text>
              <Tag color='green'>{device.live} live</Tag>
              <Tag color='blue'>{device.pulled} pulled</Tag>
              {device.fallback > 0 && <Tag color='orange'>{device.fallback} on BioBridge fallback</Tag>}
            </Space>
            <Space wrap size={6}>
              <Typography.Text style={{ fontSize: 12 }}>Devices not live are pulled every</Typography.Text>
              {canToggle ? (
                <Select
                  size='small'
                  value={pull.interval_minutes}
                  loading={savingInterval}
                  disabled={savingInterval}
                  onChange={changeInterval}
                  popupMatchSelectWidth={false}
                  options={pull.intervals.map((m) => ({ value: m, label: `${m} minutes (${trafficPerHour(m, pulledDevices)})` }))}
                  labelRender={({ value }) => `${value} minutes`}
                  style={{ width: 120 }}
                />
              ) : (
                <Typography.Text strong style={{ fontSize: 12 }}>{pull.interval_minutes} minutes</Typography.Text>
              )}
              <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                (fetch only, {trafficPerHour(pull.interval_minutes, pulledDevices)} over the branch network; last round {when(pull.round_at)})
              </Typography.Text>
            </Space>
            {round.running ? (
              <div style={{ maxWidth: 420 }}>
                <Typography.Text strong style={{ fontSize: 12 }}>
                  Pulling all devices: {Math.min(round.done, round.total || 0)} of {round.total} done (fetch only)
                </Typography.Text>
                <Progress percent={roundPercent} size='small' status='active' style={{ margin: 0 }} />
              </div>
            ) : round.message && round.finished_at ? (
              <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                Last round {when(round.finished_at)}: {round.message}
              </Typography.Text>
            ) : null}
            <Typography.Text type='secondary' style={{ fontSize: 12 }}>
              {device.active} active · {device.failed} last pull failed · {device.never} never pulled
            </Typography.Text>
            <Typography.Text style={{ fontSize: 12 }}>
              {count(device.punches)} punches pulled first · newest {when(device.newest)}
            </Typography.Text>
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

export default BiometricFeedsPanel;
