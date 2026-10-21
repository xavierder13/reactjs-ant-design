import { useState } from 'react';
import { Modal, DatePicker, Space, Typography, App } from 'antd';
import dayjs from 'dayjs';
import biometricDeviceApi from '../../services/biometric_device/biometricDeviceApi';
import handleApiError from '../../utils/handleApiError';

// Fetch from BioBridge: one device's BioBridge punches for a date range (at
// most 31 days, from Jan 1, 2026), saving only the ones not recorded yet —
// for when the device's own feed had a problem. BioBridge is only read.
const BiometricFetchModal = ({ open, device, onClose, onDone }) => {
  const { message } = App.useApp();
  const [range, setRange] = useState([dayjs().subtract(6, 'day'), dayjs()]);
  const [fetching, setFetching] = useState(false);

  const handleFetch = async () => {
    setFetching(true);
    try {
      const { data } = await biometricDeviceApi.fetchBioBridge(device.id, {
        date_from: range[0].format('YYYY-MM-DD'),
        date_to: range[1].format('YYYY-MM-DD'),
      });
      message.success(data.message);
      onDone();
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setFetching(false);
    }
  };

  return (
    <Modal
      keyboard={false}
      open={open}
      title={device ? `Fetch from BioBridge — ${device.branch}` : 'Fetch from BioBridge'}
      okText='Fetch'
      onOk={handleFetch}
      onCancel={onClose}
      confirmLoading={fetching}
      destroyOnHidden
    >
      <Space orientation='vertical' size={12} style={{ width: '100%' }}>
        <Typography.Text type='secondary'>
          Copies this device&apos;s punches from BioBridge for the dates below. A punch already recorded (same employee code and time) is not saved again. BioBridge is only read.
        </Typography.Text>
        <DatePicker.RangePicker
          value={range}
          allowClear={false}
          format='MM/DD/YYYY'
          minDate={dayjs('2026-01-01')}
          maxDate={dayjs()}
          onChange={(v) => v && setRange(v)}
        />
      </Space>
    </Modal>
  );
};

export default BiometricFetchModal;
