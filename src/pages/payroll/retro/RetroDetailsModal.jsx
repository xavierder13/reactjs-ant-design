import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Descriptions, Tag, Button, Space, Spin, Typography, App } from 'antd';
import { CloseCircleOutlined, EditOutlined } from '@ant-design/icons';
import retroApi from '../../../services/payroll/retroApi';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../../utils/formatDate';
import { ADJUSTMENT_COLORS, RETRO_STATUS_COLORS, cutoffLabel, peso } from '../payrollHelpers';
import { rateLabel } from '../../compensation/compensationHelpers';
import ReasonModal from '../ReasonModal';

// One retro adjustment with its computation; Edit / Cancel while Open.
const RetroDetailsModal = ({ retroId, refreshKey, perms, onClose, onChanged, onEdit }) => {
  const { message } = App.useApp();
  const [retro, setRetro] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!retroId) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await retroApi.show(retroId);
        setRetro(data.retro);
      } catch (error) {
        handleApiError(error, message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [retroId, refreshKey, message]);

  const cancel = async (reason) => {
    try {
      const { data } = await retroApi.cancel(retro.id, reason);
      message.success(data.message);
      setRetro(data.retro);
      setCancelling(false);
      onChanged();
    } catch (error) {
      handleApiError(error, message);
      throw error;
    }
  };

  const isOpen = retro?.status === 'Open';

  return (
    <Modal
      open={!!retroId}
      title='Retro Adjustment'
      onCancel={onClose}
      width={{ xs: '100%', sm: '95%', md: 760 }}
      destroyOnHidden
      footer={retro && isOpen && (perms.canEdit || perms.canCancel) ? (
        <Space wrap>
          {perms.canCancel && <Button danger icon={<CloseCircleOutlined />} onClick={() => setCancelling(true)}>Cancel Retro</Button>}
          {perms.canEdit && <Button type='primary' icon={<EditOutlined />} onClick={() => onEdit(retro)}>Edit</Button>}
        </Space>
      ) : null}
    >
      <Spin spinning={loading}>
        {retro && (
          <Descriptions size='small' bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label='Employee' span={{ xs: 1, sm: 2 }}>{retro.employee?.employee_code} - {retro.employee?.full_name}</Descriptions.Item>
            <Descriptions.Item label='Type'>{retro.retro_type}</Descriptions.Item>
            <Descriptions.Item label='Status'><Tag color={RETRO_STATUS_COLORS[retro.status]}>{retro.status}</Tag></Descriptions.Item>
            <Descriptions.Item label='Amount'>
              <Space size={4}><Tag color={ADJUSTMENT_COLORS[retro.adjustment]}>{retro.adjustment}</Tag><strong>{peso(retro.amount)}</strong></Space>
            </Descriptions.Item>
            <Descriptions.Item label='Period'>{formatDate(retro.period_from)} – {formatDate(retro.period_to)}</Descriptions.Item>
            <Descriptions.Item label='Cut-off' span={{ xs: 1, sm: 2 }}>{cutoffLabel(retro.cutoff)}</Descriptions.Item>
            {retro.compensation && (
              <Descriptions.Item label='From Salary Change' span={{ xs: 1, sm: 2 }}>
                {rateLabel(retro.compensation.pay_basis, retro.compensation.basic_rate)} ({retro.compensation.change_type}) effective {formatDate(retro.compensation.effective_date)}
              </Descriptions.Item>
            )}
            <Descriptions.Item label='Computation' span={{ xs: 1, sm: 2 }}>
              {retro.computation
                ? <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 12 }}>{retro.computation}</pre>
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label='Reason' span={{ xs: 1, sm: 2 }}>{retro.reason || '-'}</Descriptions.Item>
            {retro.cancel_reason && <Descriptions.Item label='Cancel Reason' span={{ xs: 1, sm: 2 }}>{retro.cancel_reason}</Descriptions.Item>}
            <Descriptions.Item label='Last Saved' span={{ xs: 1, sm: 2 }}>
              {(retro.updater || retro.creator)?.name || '-'}{' '}
              <Typography.Text type='secondary'>{dayjs(retro.updated_at).format(`${DISPLAY_DATE_FORMAT} hh:mm A`)}</Typography.Text>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Spin>
      <ReasonModal
        open={cancelling}
        title='Cancel Retro'
        label='Reason for cancelling'
        okText='Cancel Retro'
        danger
        onSubmit={cancel}
        onClose={() => setCancelling(false)}
      />
    </Modal>
  );
};

export default RetroDetailsModal;
