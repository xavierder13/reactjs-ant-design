import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Modal, Table, Tag, Button, Space, Tooltip, Popconfirm, Progress, Descriptions, Form, DatePicker,
  InputNumber, Input, Select, Row, Col, Typography, Spin, App,
} from 'antd';
import { DeleteOutlined, PauseCircleOutlined, PlayCircleOutlined, CloseCircleOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';
import deductionApi from '../../../services/payroll/deductionApi';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../../utils/formatDate';
import { DEDUCTION_STATUS_COLORS, applyFormErrors, cutoffLabel, cutoffOptions, peso, pesoInputProps } from '../payrollHelpers';
import ReasonModal from '../ReasonModal';

// One deduction: amounts, schedule, progress and its payment ledger. Record
// a manual payment, hold / resume, cancel, or delete a wrong manual payment
// — each by permission and only while the status allows it.
const DeductionDetailsModal = ({ deductionId, refreshKey, options, perms, onClose, onChanged, onEdit }) => {
  const { message } = App.useApp();
  const [paymentForm] = Form.useForm();
  const [deduction, setDeduction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchDeduction = async () => {
    setLoading(true);
    try {
      const { data } = await deductionApi.show(deductionId);
      setDeduction(data.deduction);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!deductionId) return;
    const load = async () => {
      setDeduction(null);
      setPaying(false);
      await fetchDeduction();
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deductionId, refreshKey]);

  const updated = (data) => {
    message.success(data.message);
    if (data.deduction) setDeduction(data.deduction);
    onChanged();
  };

  const run = async (request) => {
    try {
      const { data } = await request();
      updated(data);
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const openPayment = () => {
    paymentForm.resetFields();
    const next = (options.cutoffs || []).find((c) => c.date_to >= dayjs().format('YYYY-MM-DD'));
    paymentForm.setFieldsValue({
      payment_date: dayjs(),
      amount: Math.min(Number(deduction.amount_per_cutoff), Number(deduction.balance)),
      payroll_cutoff_id: next?.id,
    });
    setPaying(true);
  };

  const savePayment = async () => {
    let values;
    try {
      values = await paymentForm.validateFields();
    } catch {
      return;
    }
    setSavingPayment(true);
    try {
      const { data } = await deductionApi.addPayment(deduction.id, {
        payment_date: values.payment_date.format('YYYY-MM-DD'),
        amount: values.amount,
        payroll_cutoff_id: values.payroll_cutoff_id || null,
        remarks: values.remarks?.trim() || null,
      });
      setPaying(false);
      updated(data);
    } catch (error) {
      applyFormErrors(error, paymentForm, message, handleApiError);
    } finally {
      setSavingPayment(false);
    }
  };

  const cancel = async (reason) => {
    try {
      const { data } = await deductionApi.cancel(deduction.id, reason);
      setCancelling(false);
      updated(data);
    } catch (error) {
      handleApiError(error, message);
      throw error;
    }
  };

  const open = deduction && ['Active', 'On Hold'].includes(deduction.status);
  const total = Number(deduction?.total_amount || 0);
  const paid = Number(deduction?.total_paid || 0);
  const percent = total ? Math.round((paid / total) * 100) : 0;

  const paymentColumns = [
    { title: 'Date', dataIndex: 'payment_date', width: 110, render: (v) => formatDate(v) },
    { title: 'Cut-off', key: 'cutoff', width: 110, render: (_, p) => p.cutoff?.code || '-' },
    { title: 'Amount', dataIndex: 'amount', width: 130, align: 'right', render: (v) => peso(v) },
    { title: 'Source', dataIndex: 'source', width: 90, render: (v) => <Tag color={v === 'Payroll' ? 'blue' : 'default'}>{v}</Tag> },
    { title: 'Remarks', dataIndex: 'remarks', render: (v) => v || '-' },
    {
      title: 'Recorded By',
      key: 'by',
      width: 170,
      render: (_, p) => (
        <div>
          <div>{p.creator?.name || '-'}</div>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>{dayjs(p.created_at).format(`${DISPLAY_DATE_FORMAT} hh:mm A`)}</Typography.Text>
        </div>
      ),
    },
  ];
  if (perms.canPay) {
    paymentColumns.push({
      title: '',
      key: 'actions',
      width: 50,
      render: (_, p) => (p.source === 'Manual' && deduction.status !== 'Cancelled' ? (
        <Popconfirm
          title='Delete this payment?'
          description='Use it only for a wrong entry — the balance goes back up.'
          okText='Delete'
          okButtonProps={{ danger: true }}
          onConfirm={() => run(() => deductionApi.deletePayment(p.id))}
        >
          <Tooltip title='Delete'>
            <Button size='small' danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      ) : null),
    });
  }

  return (
    <Modal
      open={!!deductionId}
      title='Deduction'
      footer={null}
      onCancel={onClose}
      width={{ xs: '100%', sm: '95%', lg: 1000 }}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        {deduction && (
          <>
            <Descriptions size='small' bordered column={{ xs: 1, sm: 2, lg: 3 }} style={{ marginBottom: 12 }}>
              <Descriptions.Item label='Employee' span={{ xs: 1, sm: 2, lg: 2 }}>
                {deduction.employee?.employee_code} - {deduction.employee?.full_name}
              </Descriptions.Item>
              <Descriptions.Item label='Status'>
                <Tag color={DEDUCTION_STATUS_COLORS[deduction.status]}>{deduction.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label='Type'>{deduction.type?.name}</Descriptions.Item>
              <Descriptions.Item label='Reference No.'>{deduction.reference_no || '-'}</Descriptions.Item>
              <Descriptions.Item label='Date Granted'>{formatDate(deduction.date_granted)}</Descriptions.Item>
              <Descriptions.Item label='Total'>{peso(deduction.total_amount)}</Descriptions.Item>
              <Descriptions.Item label='Per Cut-off'>{peso(deduction.amount_per_cutoff)}</Descriptions.Item>
              <Descriptions.Item label='Deduct On'>{deduction.schedule}</Descriptions.Item>
              <Descriptions.Item label='Start Cut-off' span={{ xs: 1, sm: 2, lg: 3 }}>{cutoffLabel(deduction.start_cutoff)}</Descriptions.Item>
              {deduction.remarks && <Descriptions.Item label='Remarks' span={{ xs: 1, sm: 2, lg: 3 }}>{deduction.remarks}</Descriptions.Item>}
              {deduction.cancel_reason && <Descriptions.Item label='Cancel Reason' span={{ xs: 1, sm: 2, lg: 3 }}>{deduction.cancel_reason}</Descriptions.Item>}
            </Descriptions>

            <Row gutter={16} align='middle' style={{ marginBottom: 12 }}>
              <Col xs={24} md={12}>
                <Progress percent={percent} status={deduction.status === 'Fully Paid' ? 'success' : 'normal'} />
                <Typography.Text type='secondary'>
                  Paid {peso(deduction.total_paid)} of {peso(deduction.total_amount)} · Balance <strong>{peso(deduction.balance)}</strong>
                </Typography.Text>
              </Col>
              <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                <Space wrap style={{ justifyContent: 'flex-end' }}>
                  {perms.canEdit && open && (
                    <Button icon={<EditOutlined />} onClick={() => onEdit(deduction)}>Edit</Button>
                  )}
                  {perms.canEdit && deduction.status === 'Active' && (
                    <Popconfirm title='Put this deduction on hold?' description='It is skipped by payroll until resumed.' onConfirm={() => run(() => deductionApi.hold(deduction.id))}>
                      <Button icon={<PauseCircleOutlined />}>Hold</Button>
                    </Popconfirm>
                  )}
                  {perms.canEdit && deduction.status === 'On Hold' && (
                    <Popconfirm title='Resume this deduction?' onConfirm={() => run(() => deductionApi.resume(deduction.id))}>
                      <Button icon={<PlayCircleOutlined />}>Resume</Button>
                    </Popconfirm>
                  )}
                  {perms.canCancel && open && (
                    <Button danger icon={<CloseCircleOutlined />} onClick={() => setCancelling(true)}>Cancel Deduction</Button>
                  )}
                  {perms.canPay && open && (
                    <Button type='primary' icon={<PlusOutlined />} onClick={openPayment}>Record Payment</Button>
                  )}
                </Space>
              </Col>
            </Row>

            {paying && (
              <div style={{ background: '#f6ffed', border: '1px solid #d9f7be', borderRadius: 8, padding: '12px 16px 0', marginBottom: 12 }}>
                <Form form={paymentForm} layout='vertical'>
                  <Row gutter={12} align='bottom'>
                    <Col xs={12} md={5}>
                      <Form.Item name='payment_date' label='Payment Date' rules={[{ required: true, message: 'Date is required' }]}>
                        <DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={5}>
                      <Form.Item
                        name='amount'
                        label='Amount'
                        rules={[
                          { required: true, message: 'Amount is required' },
                          { validator: (_, v) => (v > Number(deduction.balance) ? Promise.reject(new Error('More than the balance')) : Promise.resolve()) },
                        ]}
                      >
                        <InputNumber {...pesoInputProps} min={0.01} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item name='payroll_cutoff_id' label='Cut-off'>
                        <Select allowClear options={cutoffOptions(options.cutoffs)} placeholder='None' showSearch={{ optionFilterProp: 'label' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name='remarks' label='Remarks'>
                        <Input maxLength={1000} placeholder='e.g. OR no., paid over the counter' />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Space style={{ marginBottom: 12 }}>
                    <Button onClick={() => setPaying(false)}>Close</Button>
                    <Button type='primary' loading={savingPayment} onClick={savePayment}>Save Payment</Button>
                  </Space>
                </Form>
              </div>
            )}

            <Typography.Text strong>Payments</Typography.Text>
            <Table
              rowKey='id'
              size='small'
              columns={paymentColumns}
              dataSource={deduction.payments || []}
              pagination={false}
              scroll={{ x: 800, y: 300 }}
              locale={{ emptyText: 'No payment yet' }}
              style={{ marginTop: 8 }}
            />
          </>
        )}
      </Spin>
      <ReasonModal
        open={cancelling}
        title='Cancel Deduction'
        label='Reason for cancelling'
        okText='Cancel Deduction'
        danger
        onSubmit={cancel}
        onClose={() => setCancelling(false)}
      />
    </Modal>
  );
};

export default DeductionDetailsModal;
