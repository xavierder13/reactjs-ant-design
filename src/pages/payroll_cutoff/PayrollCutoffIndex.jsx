import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Table, Tag, Button, Space, Select, Modal, Form, Input, DatePicker, Radio, Checkbox, Tooltip, Typography, Popconfirm, App,
} from 'antd';
import { PlusOutlined, ReloadOutlined, ThunderboltOutlined, EyeOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import payrollCutoffApi from '../../services/payroll/payrollCutoffApi';
import handleApiError from '../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../utils/formatDate';
import { tablePagination } from '../../utils/tablePagination';
import RecordRowActions from '../record_management/RecordRowActions';
import { applyLeaveErrors } from '../leave/leaveHelpers';
import CutoffFilingHistoryModal from './CutoffFilingHistoryModal';

const YEARS = [-1, 0, 1].map((d) => dayjs().year() + d);

// Payroll cut-offs and the filing switch: turning a period's filing OFF stops
// leave and manual time entries from being filed, edited or approved for
// any date inside it (while payroll processes it); ON allows them again.
// Every switch is logged (who, when, why).
const PayrollCutoffIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('payroll-cutoff-create');
  const canEdit   = isAdmin || hasPermission('payroll-cutoff-edit');
  const canDelete = isAdmin || hasPermission('payroll-cutoff-delete');
  const canToggle = isAdmin || hasPermission('payroll-cutoff-filing-toggle');

  const [year, setYear]       = useState(dayjs().year());
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);   // {} = create
  const [genOpen, setGenOpen] = useState(false);
  const [switching, setSwitching] = useState(null); // row being turned off
  const [reason, setReason]   = useState('');
  const [logsFor, setLogsFor] = useState(null);
  const [logs, setLogs]       = useState(null);
  const [form] = Form.useForm();
  const [genForm] = Form.useForm();

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await payrollCutoffApi.getAll({ year });
      setRows(data.cutoffs);
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
  }, [year]);

  const openForm = (record) => {
    setEditing(record || {});
    form.resetFields();
    if (record) {
      form.setFieldsValue({
        code: record.code,
        dates: [dayjs(record.date_from), dayjs(record.date_to)],
        pay_date: record.pay_date ? dayjs(record.pay_date) : null,
        remarks: record.remarks,
      });
    }
  };

  const save = async () => {
    let v;
    try { v = await form.validateFields(); } catch { return; }
    const payload = {
      code: v.code.trim(),
      date_from: v.dates[0].format('YYYY-MM-DD'),
      date_to: v.dates[1].format('YYYY-MM-DD'),
      pay_date: v.pay_date ? v.pay_date.format('YYYY-MM-DD') : null,
      remarks: v.remarks?.trim() || null,
    };
    try {
      const { data } = editing?.id ? await payrollCutoffApi.update(editing.id, payload) : await payrollCutoffApi.create(payload);
      message.success(data.message);
      setEditing(null);
      fetchRows();
    } catch (error) {
      applyLeaveErrors(error, form, message, handleApiError);
      const bag = error.response?.data;
      if (bag?.date_from || bag?.date_to) form.setFields([{ name: 'dates', errors: [].concat(bag.date_from || bag.date_to) }]);
    }
  };

  const generate = async () => {
    let v;
    try { v = await genForm.validateFields(); } catch { return; }
    try {
      const { data } = await payrollCutoffApi.generate(v);
      message.success(data.message);
      setGenOpen(false);
      if (v.year !== year) setYear(v.year); else fetchRows();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  // The switch.
  const turn = async (record, open, why) => {
    try {
      const { data } = await payrollCutoffApi.toggle(record.id, open, why || null);
      message.success(data.message);
      setSwitching(null);
      fetchRows();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const openLogs = async (record) => {
    setLogsFor(record);
    setLogs(null);
    try {
      const { data } = await payrollCutoffApi.logs(record.id);
      setLogs({ cutoff: record, items: data.logs });
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const remove = async (record) => {
    try {
      const { data } = await payrollCutoffApi.delete(record.id);
      message.success(data.message);
      fetchRows();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', width: 130 },
    {
      title: 'Period',
      key: 'period',
      render: (_, r) => `${formatDate(r.date_from)} – ${formatDate(r.date_to)} (${dayjs(r.date_to).diff(dayjs(r.date_from), 'day') + 1} days)`,
    },
    { title: 'Pay Date', dataIndex: 'pay_date', width: 120, render: (d) => (d ? formatDate(d) : '—') },
    {
      title: 'Filing',
      key: 'filing',
      width: 200,
      render: (_, r) => (
        <Space>
          <Tag color={r.filing_open ? 'green' : 'red'}>{r.filing_open ? 'ON' : 'OFF'}</Tag>
          {canToggle && (r.filing_open ? (
            <Button size='small' danger onClick={() => { setReason(''); setSwitching(r); }}>Turn off</Button>
          ) : (
            <Popconfirm title={`Turn filing ON for ${r.code}?`} description='Leave and time entries can be filed for these dates again.' onConfirm={() => turn(r, true)}>
              <Button size='small' type='primary' ghost>Turn on</Button>
            </Popconfirm>
          ))}
        </Space>
      ),
    },
    { title: 'Remarks', dataIndex: 'remarks', ellipsis: true, render: (v) => v || '—' },
    {
      title: 'Actions',
      width: 130,
      render: (_, r) => (
        <Space>
          <Tooltip title='Filing history'>
            <Button color='blue' variant='outlined' icon={<EyeOutlined />} size='small' onClick={() => openLogs(r)} />
          </Tooltip>
          <RecordRowActions
            canEdit={canEdit}
            canDelete={canDelete && r.filing_open}
            onEdit={() => openForm(r)}
            onDelete={() => remove(r)}
            deleteTitle='Delete this cut-off?'
            deleteDescription='Its filing history is removed too.'
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Select value={year} onChange={setYear} options={YEARS.map((y) => ({ value: y, label: y }))} style={{ width: 100 }} />
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchRows} loading={loading}>Refresh</Button>
          {canCreate && (
            <Button icon={<ThunderboltOutlined />} onClick={() => { genForm.resetFields(); genForm.setFieldsValue({ year, pattern: 'semi-monthly', update_pay_dates: false }); setGenOpen(true); }}>
              Generate Year
            </Button>
          )}
          {canCreate && <Button type='primary' icon={<PlusOutlined />} onClick={() => openForm(null)}>Create Cut-off</Button>}
        </Space>
      </Space>
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: 900 }}
        pagination={tablePagination(24)}
      />

      <Modal
        open={!!editing}
        title={editing?.id ? 'Edit Cut-off' : 'Create Cut-off'}
        okText='Save'
        onOk={save}
        onCancel={() => setEditing(null)}
        forceRender
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='code' label='Code' rules={[{ required: true, whitespace: true, message: 'Code is required' }]}>
            <Input maxLength={30} placeholder='e.g. 2026-10-A' style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item
            name='dates'
            label='Period'
            extra={editing?.id && !editing.filing_open ? 'Filing is OFF — turn it on before changing the dates.' : null}
            rules={[{ required: true, message: 'Period is required' }]}
          >
            <DatePicker.RangePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name='pay_date' label='Pay Date'>
            <DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name='remarks' label='Remarks'>
            <Input.TextArea rows={2} maxLength={2000} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={genOpen} title='Generate a Year of Cut-offs' okText='Generate' onOk={generate} onCancel={() => setGenOpen(false)} forceRender>
        <Form form={genForm} layout='vertical'>
          <Form.Item name='year' label='Year' rules={[{ required: true }]}>
            <Select options={YEARS.map((y) => ({ value: y, label: y }))} />
          </Form.Item>
          <Form.Item name='pattern' label='Pattern' rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { value: 'semi-monthly', label: 'Semi-monthly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
          </Form.Item>
          <Form.Item name='update_pay_dates' valuePropName='checked' extra='Re-applies the pay-day rule to the cut-offs of this year that already exist (filing on only).'>
            <Checkbox>Update the pay dates of existing cut-offs</Checkbox>
          </Form.Item>
          <Typography.Paragraph type='secondary' style={{ marginBottom: 0 }}>
            The periods and pay days come from Payroll Settings → General → Cut-offs &amp; Pay Days. Periods that already exist or would overlap one are skipped.
          </Typography.Paragraph>
        </Form>
      </Modal>

      <Modal
        open={!!switching}
        title={`Turn filing OFF — ${switching?.code || ''}`}
        okText='Turn off'
        okButtonProps={{ danger: true, disabled: !reason.trim() }}
        onOk={() => turn(switching, false, reason.trim())}
        onCancel={() => setSwitching(null)}
        destroyOnHidden
      >
        <Typography.Paragraph>
          {`No leave or manual time entry can be filed, edited or approved for ${switching ? `${formatDate(switching.date_from)} – ${formatDate(switching.date_to)}` : ''} until filing is turned back on.`}
        </Typography.Paragraph>
        <Input.TextArea rows={2} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder='Reason (required), e.g. Payroll processing' />
      </Modal>

      <CutoffFilingHistoryModal open={!!logsFor} cutoff={logs?.cutoff} logs={logs?.items} onClose={() => setLogsFor(null)} />
    </div>
  );
};

export default PayrollCutoffIndex;
