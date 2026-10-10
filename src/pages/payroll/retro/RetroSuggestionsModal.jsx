import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Table, Tag, Button, Space, Tooltip, Alert, Typography, App } from 'antd';
import { CloseCircleOutlined, EditOutlined } from '@ant-design/icons';
import retroApi from '../../../services/payroll/retroApi';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../../utils/formatDate';
import ExpandIcon from '../../../components/ExpandIcon';
import { ADJUSTMENT_COLORS, peso } from '../payrollHelpers';
import { rateLabel } from '../../compensation/compensationHelpers';
import ReasonModal from '../ReasonModal';

// Salary changes saved after their effective date whose payroll cut-offs
// were already paid at the old rate — each with the computed retro. Fill in
// opens the retro form prefilled; Dismiss records that it won't be paid.
const RetroSuggestionsModal = ({ open, refreshKey, onClose, onCreate, onChanged }) => {
  const { message } = App.useApp();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dismissing, setDismissing] = useState(null);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await retroApi.suggestions();
      setRows(data.suggestions);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const load = async () => { await fetchRows(); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, refreshKey]);

  const dismiss = async (reason) => {
    try {
      const { data } = await retroApi.dismiss(dismissing.compensation_id, reason);
      message.success(data.message);
      setDismissing(null);
      fetchRows();
      onChanged();
    } catch (error) {
      handleApiError(error, message);
      throw error;
    }
  };

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      width: 220,
      render: (_, r) => (
        <div>
          <div>{r.employee?.full_name}</div>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>{r.employee?.employee_code} · {r.employee?.branch?.name || '-'}</Typography.Text>
        </div>
      ),
    },
    {
      title: 'Salary Change',
      key: 'change',
      width: 260,
      render: (_, r) => (
        <div>
          <div>{rateLabel(r.previous.pay_basis, r.previous.basic_rate)} → <strong>{rateLabel(r.version.pay_basis, r.version.basic_rate)}</strong></div>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>
            {r.version.change_type} · effective {formatDate(r.version.effective_date)} · saved {dayjs(r.version.created_at).format(DISPLAY_DATE_FORMAT)}
          </Typography.Text>
        </div>
      ),
    },
    { title: 'Period', key: 'period', width: 190, render: (_, r) => `${formatDate(r.period_from)} – ${formatDate(r.period_to)}` },
    {
      title: 'Retro',
      key: 'amount',
      width: 150,
      align: 'right',
      render: (_, r) => (r.amount === null
        ? <Tag color='orange'>Compute by hand</Tag>
        : <Space size={4}><Tag color={ADJUSTMENT_COLORS[r.adjustment]}>{r.adjustment === 'Earning' ? '+' : '−'}</Tag>{peso(r.amount)}</Space>),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 90,
      fixed: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title='Fill in retro'>
            <Button size='small' color='green' variant='outlined' icon={<EditOutlined />} onClick={() => onCreate(r)} />
          </Tooltip>
          <Tooltip title='Dismiss (not paid)'>
            <Button size='small' color='orange' variant='outlined' icon={<CloseCircleOutlined />} onClick={() => setDismissing(r)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      keyboard={false}
      open={open}
      title='Retro Suggestions'
      footer={null}
      onCancel={onClose}
      width={{ xs: '100%', sm: '95%', lg: 1100 }}
      destroyOnHidden
    >
      <Alert
        type='info'
        showIcon
        style={{ marginBottom: 12 }}
        title='Salary changes saved after their effective date: the payroll cut-offs that ended before the change was saved paid the old rate. Monthly rate = the difference prorated by calendar days; daily rate = difference × scheduled work days. Check each against what was actually paid.'
      />
      <Table
        rowKey='compensation_id'
        size='small'
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={false}
        scroll={{ x: 950, y: 480 }}
        locale={{ emptyText: 'No back-dated salary change waiting for a retro' }}
        expandable={{
          expandIcon: (props) => <ExpandIcon {...props} />,
          expandedRowRender: (r) => <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 12 }}>{r.computation}</pre>,
        }}
      />
      <ReasonModal
        open={!!dismissing}
        title='Dismiss Suggestion'
        label='Why it won’t be paid'
        okText='Dismiss'
        onSubmit={dismiss}
        onClose={() => setDismissing(null)}
      />
    </Modal>
  );
};

export default RetroSuggestionsModal;
