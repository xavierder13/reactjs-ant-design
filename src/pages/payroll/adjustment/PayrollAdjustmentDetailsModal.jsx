import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Descriptions, Tag, Button, Space, Spin, Table, Timeline, Typography, App } from 'antd';
import { CloseCircleOutlined, EditOutlined } from '@ant-design/icons';
import payrollAdjustmentApi from '../../../services/payroll/payrollAdjustmentApi';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../../utils/formatDate';
import { ADJUSTMENT_COLORS, ADJUSTMENT_STATUS_COLORS, cutoffLabel, peso, adjustmentLabel } from '../payrollHelpers';
import { rateLabel } from '../../compensation/compensationHelpers';
import ReasonModal from '../ReasonModal';

// "2026-09-B (09/16–09/30): 2,000.00 × 15/30 days = 1,000.00" → one row
// per cut-off; a hand-typed line that doesn't follow it stays as text.
const COMPUTATION_LINE = /^(\S+) \(([^)]+)\): (.+) = (-?[\d,]+(?:\.\d+)?)$/;
const computationRows = (text) => text.split('\n').filter((l) => l.trim()).map((line, i) => {
  const m = line.trim().match(COMPUTATION_LINE);
  return m ? { key: i, cutoff: m[1], covers: m[2], formula: m[3], amount: m[4] } : { key: i, text: line };
});

const COMPUTATION_COLUMNS = [
  { title: 'Cut-off', dataIndex: 'cutoff', width: 110, onCell: (r) => (r.text ? { colSpan: 4 } : {}), render: (v, r) => r.text || v },
  { title: 'Covers', dataIndex: 'covers', width: 120, onCell: (r) => (r.text ? { colSpan: 0 } : {}) },
  { title: 'Computation', dataIndex: 'formula', onCell: (r) => (r.text ? { colSpan: 0 } : {}) },
  { title: 'Amount', dataIndex: 'amount', width: 120, align: 'right', onCell: (r) => (r.text ? { colSpan: 0 } : {}) },
];

// The lines' amounts add up to the saved amount (null when a line is hand-typed).
const linesTotal = (rows) => (rows.every((r) => !r.text)
  ? rows.reduce((sum, r) => sum + Number(r.amount.replace(/,/g, '')), 0)
  : null);

const when = (v) => (v ? dayjs(v).format(`${DISPLAY_DATE_FORMAT} hh:mm A`) : '—');

// One payroll adjustment: a summary, where it comes from, its computation per
// cut-off and its record trail (saved / cancelled); Edit / Cancel while Open.
const PayrollAdjustmentDetailsModal = ({ adjustmentId, refreshKey, perms, onClose, onChanged, onEdit }) => {
  const { message } = App.useApp();
  const [adjustment, setAdjustment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!adjustmentId) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await payrollAdjustmentApi.show(adjustmentId);
        setAdjustment(data.payroll_adjustment);
      } catch (error) {
        handleApiError(error, message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [adjustmentId, refreshKey, message]);

  const cancel = async (reason) => {
    try {
      const { data } = await payrollAdjustmentApi.cancel(adjustment.id, reason);
      message.success(data.message);
      setAdjustment(data.payroll_adjustment);
      setCancelling(false);
      onChanged();
    } catch (error) {
      handleApiError(error, message);
      throw error;
    }
  };

  const isOpen = adjustment?.status === 'Open';

  return (
    <Modal
      keyboard={false}
      open={!!adjustmentId}
      title='Payroll Adjustment'
      onCancel={onClose}
      afterOpenChange={(open) => { if (!open) setAdjustment(null); }}
      width={{ xs: '100%', sm: '95%', md: 820 }}
      destroyOnHidden
      footer={adjustment && isOpen && (perms.canEdit || perms.canCancel) ? (
        <Space wrap>
          {perms.canCancel && <Button danger icon={<CloseCircleOutlined />} onClick={() => setCancelling(true)}>Cancel Adjustment</Button>}
          {perms.canEdit && <Button type='primary' icon={<EditOutlined />} onClick={() => onEdit(adjustment)}>Edit</Button>}
        </Space>
      ) : null}
    >
      <Spin spinning={loading}>
        {adjustment && (
          <>
            <Descriptions
              size='small'
              column={{ xs: 1, sm: 2 }}
              style={{ marginBottom: 16 }}
              items={[
                { key: 'employee', label: 'Employee', children: `${adjustment.employee?.employee_code || ''} - ${adjustment.employee?.full_name || ''}` },
                { key: 'status', label: 'Status', children: <Tag color={ADJUSTMENT_STATUS_COLORS[adjustment.status]}>{adjustment.status}</Tag> },
                {
                  key: 'type',
                  label: 'Type',
                  children: (
                    <Space size={4} wrap>
                      {adjustment.adjustment_type === 'Other Adjustment' ? `Other — ${adjustmentLabel(adjustment)}` : adjustment.adjustment_type}
                      <Tag>{adjustment.taxable ? 'Taxable' : 'Non-taxable'}</Tag>
                    </Space>
                  ),
                },
                {
                  key: 'amount',
                  label: 'Amount',
                  children: <Space size={4}><Tag color={ADJUSTMENT_COLORS[adjustment.adjustment]}>{adjustment.adjustment}</Tag><strong>{peso(adjustment.amount)}</strong></Space>,
                },
                { key: 'period', label: 'Period', children: `${formatDate(adjustment.period_from)} – ${formatDate(adjustment.period_to)}` },
                { key: 'cutoff', label: 'Paid in Cut-off', children: cutoffLabel(adjustment.cutoff) },
              ]}
            />
            <Typography.Title level={5}>Details</Typography.Title>
            <Descriptions
              size='small'
              bordered
              column={1}
              styles={{ label: { width: 180 } }}
              items={[
                {
                  key: 'source',
                  label: 'From Salary Change',
                  children: adjustment.compensation
                    ? (
                      <>
                        <strong>{rateLabel(adjustment.compensation.pay_basis, adjustment.compensation.basic_rate)}</strong>
                        {` (${adjustment.compensation.change_type}) effective ${formatDate(adjustment.compensation.effective_date)}`}
                      </>
                    )
                    : <Typography.Text type='secondary'>Entered by hand</Typography.Text>,
                },
                { key: 'reason', label: 'Reason', children: adjustment.reason || '—' },
              ]}
            />
            <Typography.Title level={5} style={{ marginTop: 16 }}>Computation</Typography.Title>
            {adjustment.computation ? (
              <>
                <Table
                  size='small'
                  bordered
                  pagination={false}
                  columns={COMPUTATION_COLUMNS}
                  dataSource={computationRows(adjustment.computation)}
                  scroll={{ x: 'max-content' }}
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3}><strong>Saved Amount</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align='right'><strong>{peso(adjustment.amount)}</strong></Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
                {(() => {
                  const sum = linesTotal(computationRows(adjustment.computation));
                  return sum !== null && Math.abs(sum - Number(adjustment.amount)) > 0.01 && (
                    <Typography.Text type='warning' style={{ display: 'block', marginTop: 6 }}>
                      {`The lines add up to ${peso(sum)} — the saved amount was changed by hand.`}
                    </Typography.Text>
                  );
                })()}
              </>
            ) : <Typography.Text type='secondary'>No computation saved — the amount was entered directly.</Typography.Text>}
            <Typography.Title level={5} style={{ marginTop: 16 }}>History</Typography.Title>
            <Timeline
              items={[
                {
                  key: 'created',
                  color: 'blue',
                  content: (
                    <div>
                      <Tag color='blue'>Created</Tag>
                      <Typography.Text type='secondary'>{`${when(adjustment.created_at)} · ${adjustment.creator?.name || 'System'}`}</Typography.Text>
                    </div>
                  ),
                },
                // a dismissed suggestion is saved already cancelled (same timestamps)
                ...(adjustment.updated_at !== adjustment.created_at || adjustment.status === 'Cancelled' ? [{
                  key: 'updated',
                  color: adjustment.status === 'Cancelled' ? 'gray' : 'green',
                  content: (
                    <div>
                      <Tag color={adjustment.status === 'Cancelled' ? 'default' : 'green'}>{adjustment.status === 'Cancelled' ? 'Cancelled' : 'Last Edited'}</Tag>
                      <Typography.Text type='secondary'>{`${when(adjustment.updated_at)} · ${adjustment.updater?.name || 'System'}`}</Typography.Text>
                      {adjustment.cancel_reason && (
                        <div style={{ marginTop: 4 }}>
                          <Typography.Text type='secondary'>Reason: </Typography.Text>
                          <Typography.Text italic>{adjustment.cancel_reason}</Typography.Text>
                        </div>
                      )}
                    </div>
                  ),
                }] : []),
              ]}
            />
          </>
        )}
      </Spin>
      <ReasonModal
        open={cancelling}
        title='Cancel Adjustment'
        label='Reason for cancelling'
        okText='Cancel Adjustment'
        danger
        onSubmit={cancel}
        onClose={() => setCancelling(false)}
      />
    </Modal>
  );
};

export default PayrollAdjustmentDetailsModal;
