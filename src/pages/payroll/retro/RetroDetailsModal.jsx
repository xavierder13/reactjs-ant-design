import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Descriptions, Tag, Button, Space, Spin, Table, Timeline, Typography, App } from 'antd';
import { CloseCircleOutlined, EditOutlined } from '@ant-design/icons';
import retroApi from '../../../services/payroll/retroApi';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../../utils/formatDate';
import { ADJUSTMENT_COLORS, RETRO_STATUS_COLORS, cutoffLabel, peso, retroLabel } from '../payrollHelpers';
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

// One retro adjustment: a summary, where it comes from, its computation per
// cut-off and its record trail (saved / cancelled); Edit / Cancel while Open.
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
      width={{ xs: '100%', sm: '95%', md: 820 }}
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
          <>
            <Descriptions
              size='small'
              column={{ xs: 1, sm: 2 }}
              style={{ marginBottom: 16 }}
              items={[
                { key: 'employee', label: 'Employee', children: `${retro.employee?.employee_code || ''} - ${retro.employee?.full_name || ''}` },
                { key: 'status', label: 'Status', children: <Tag color={RETRO_STATUS_COLORS[retro.status]}>{retro.status}</Tag> },
                {
                  key: 'type',
                  label: 'Type',
                  children: (
                    <Space size={4} wrap>
                      {retro.retro_type === 'Other Adjustment' ? `Other — ${retroLabel(retro)}` : retro.retro_type}
                      <Tag>{retro.taxable ? 'Taxable' : 'Non-taxable'}</Tag>
                    </Space>
                  ),
                },
                {
                  key: 'amount',
                  label: 'Amount',
                  children: <Space size={4}><Tag color={ADJUSTMENT_COLORS[retro.adjustment]}>{retro.adjustment}</Tag><strong>{peso(retro.amount)}</strong></Space>,
                },
                { key: 'period', label: 'Period', children: `${formatDate(retro.period_from)} – ${formatDate(retro.period_to)}` },
                { key: 'cutoff', label: 'Paid in Cut-off', children: cutoffLabel(retro.cutoff) },
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
                  children: retro.compensation
                    ? (
                      <>
                        <strong>{rateLabel(retro.compensation.pay_basis, retro.compensation.basic_rate)}</strong>
                        {` (${retro.compensation.change_type}) effective ${formatDate(retro.compensation.effective_date)}`}
                      </>
                    )
                    : <Typography.Text type='secondary'>Entered by hand</Typography.Text>,
                },
                { key: 'reason', label: 'Reason', children: retro.reason || '—' },
              ]}
            />
            <Typography.Title level={5} style={{ marginTop: 16 }}>Computation</Typography.Title>
            {retro.computation ? (
              <>
                <Table
                  size='small'
                  bordered
                  pagination={false}
                  columns={COMPUTATION_COLUMNS}
                  dataSource={computationRows(retro.computation)}
                  scroll={{ x: 'max-content' }}
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3}><strong>Saved Amount</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align='right'><strong>{peso(retro.amount)}</strong></Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
                {(() => {
                  const sum = linesTotal(computationRows(retro.computation));
                  return sum !== null && Math.abs(sum - Number(retro.amount)) > 0.01 && (
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
                      <Typography.Text type='secondary'>{`${when(retro.created_at)} · ${retro.creator?.name || 'System'}`}</Typography.Text>
                    </div>
                  ),
                },
                // a dismissed suggestion is saved already cancelled (same timestamps)
                ...(retro.updated_at !== retro.created_at || retro.status === 'Cancelled' ? [{
                  key: 'updated',
                  color: retro.status === 'Cancelled' ? 'gray' : 'green',
                  content: (
                    <div>
                      <Tag color={retro.status === 'Cancelled' ? 'default' : 'green'}>{retro.status === 'Cancelled' ? 'Cancelled' : 'Last Edited'}</Tag>
                      <Typography.Text type='secondary'>{`${when(retro.updated_at)} · ${retro.updater?.name || 'System'}`}</Typography.Text>
                      {retro.cancel_reason && (
                        <div style={{ marginTop: 4 }}>
                          <Typography.Text type='secondary'>Reason: </Typography.Text>
                          <Typography.Text italic>{retro.cancel_reason}</Typography.Text>
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
