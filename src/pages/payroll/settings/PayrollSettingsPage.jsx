import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Tabs, Form, Input, InputNumber, Select, TimePicker, Button, Row, Col, Card, Table, Tag, Alert, Typography, Spin, Switch, Space, Tooltip, Popconfirm, App,
} from 'antd';
import { SaveOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import useAuth from '../../../hooks/useAuth';
import payrollSettingApi from '../../../services/payroll/payrollSettingApi';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../../utils/formatDate';
import { applyFormErrors } from '../payrollHelpers';
import CompanyAccountFormModal from './CompanyAccountFormModal';
import { DAY_TYPE_COLORS } from '../../overtime/overtimeHelpers';

const FACTOR_HINTS = {
  261: '5-day work week (Sat & Sun off)',
  313: '6-day work week (Sunday off)',
  365: 'paid every day of the year',
};
const AGENCIES = [
  { key: 'sss_deduction', label: 'SSS' },
  { key: 'philhealth_deduction', label: 'PhilHealth' },
  { key: 'pagibig_deduction', label: 'Pag-IBIG' },
  { key: 'tax_deduction', label: 'Withholding Tax' },
];
const toTime = (t) => (t ? dayjs(`2000-01-01 ${String(t).slice(0, 5)}`) : null);
const DAYS_1_28 = Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
const PAY_DAYS = [{ value: 0, label: 'Last day of the month' }, ...Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: `${i + 1}` }))];
const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)]}`;
const payDayText = (d) => (d === 0 ? 'the last day of the month' : `the ${ordinal(d)}`);

// "1–15 and 16–end" / "26–10 and 11–25" for the two start days.
const cutoffPatternText = (a, b) => {
  if (!a || !b || a === b) return '…';
  const end = (start) => (start === 1 ? 'end' : String(start - 1));
  return `${a}–${b - 1} and ${b}–${end(a)}`;
};

// Payroll rules the payroll run reads: the daily-rate factor, hours per day,
// the night-differential window, when each statutory deduction is taken,
// the cut-off pattern and pay days the cut-off generator uses, and the
// holiday-pay rule and the employer's registration on government forms
// (General), and the premium pay per day type (Premium
// Rates).
const PayrollSettingsPage = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const canEdit = hasRole('Administrator') || hasPermission('payroll-setting-edit');

  const [form] = Form.useForm();
  const [data, setData] = useState(null);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingRates, setSavingRates] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null); // {} = add

  const reloadAccounts = async () => {
    try {
      const { data: res } = await payrollSettingApi.show();
      setData((d) => ({ ...d, accounts: res.accounts, banks: res.banks }));
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const removeAccount = async (account) => {
    try {
      const { data: res } = await payrollSettingApi.accountDelete(account.id);
      message.success(res.message);
      reloadAccounts();
    } catch (error) {
      handleApiError(error, message);
    }
  };
  const factor = Form.useWatch('daily_rate_factor', form);
  const firstDay = Form.useWatch('cutoff_first_day', form);
  const secondDay = Form.useWatch('cutoff_second_day', form);
  const payFirst = Form.useWatch('pay_day_first', form);
  const paySecond = Form.useWatch('pay_day_second', form);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: res } = await payrollSettingApi.show();
        setData(res);
        setRates(res.rates.map((r) => ({ ...r })));
        form.setFieldsValue({
          ...res.setting,
          hours_per_day: Number(res.setting.hours_per_day),
          night_diff_from: toTime(res.setting.night_diff_from),
          night_diff_to: toTime(res.setting.night_diff_to),
        });
      } catch (error) {
        handleApiError(error, message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [form, message]);

  const save = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const { data: res } = await payrollSettingApi.save({
        ...values,
        night_diff_from: values.night_diff_from.format('HH:mm'),
        night_diff_to: values.night_diff_to.format('HH:mm'),
      });
      message.success(res.message);
      setData((d) => ({ ...d, setting: res.setting }));
    } catch (error) {
      applyFormErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  const setRate = (dayType, field, value) => {
    setRates((rows) => rows.map((r) => (r.day_type === dayType ? { ...r, [field]: value } : r)));
  };

  const saveRates = async () => {
    if (rates.some((r) => ['regular_rate', 'overtime_rate', 'night_diff_rate', 'unworked_rate'].some((f) => r[f] === null || r[f] === undefined || r[f] === ''))) {
      message.error('Fill in every rate');
      return;
    }
    setSavingRates(true);
    try {
      const { data: res } = await payrollSettingApi.saveRates(rates);
      message.success(res.message);
      setRates(res.rates.map((r) => ({ ...r })));
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSavingRates(false);
    }
  };

  const percentInput = (field, max = 1000) => (value, r) => (
    <InputNumber
      value={value === null || value === undefined ? null : Number(value)}
      min={0}
      max={max}
      precision={2}
      suffix='%'
      disabled={!canEdit}
      onChange={(v) => setRate(r.day_type, field, v)}
      style={{ width: '100%' }}
    />
  );

  const rateColumns = [
    { title: 'Day Type', dataIndex: 'day_type', width: 240, fixed: 'left', render: (v) => <Tag color={DAY_TYPE_COLORS[v]}>{v}</Tag> },
    { title: 'Regular Hours', dataIndex: 'regular_rate', width: 140, render: percentInput('regular_rate') },
    { title: 'Overtime Hour', dataIndex: 'overtime_rate', width: 140, render: percentInput('overtime_rate') },
    { title: 'Night Diff. (added)', dataIndex: 'night_diff_rate', width: 150, render: percentInput('night_diff_rate', 100) },
    { title: 'Paid if Unworked', dataIndex: 'unworked_rate', width: 150, render: percentInput('unworked_rate') },
  ];

  const lastSaved = data?.setting?.updater?.name
    ? `Last saved by ${data.setting.updater.name}, ${dayjs(data.setting.updated_at).format(`${DISPLAY_DATE_FORMAT} hh:mm A`)}`
    : 'Starting values (seeded) — review them';

  return (
    <Spin spinning={loading}>
      <Tabs
        items={[
          {
            key: 'general',
            label: 'General',
            children: (
              <Form form={form} layout='vertical' disabled={!canEdit} style={{ maxWidth: 900 }}>
                <Alert
                  type='info'
                  showIcon
                  style={{ marginBottom: 16 }}
                  title='The payroll run keeps a copy of these settings, so a change applies to runs made after it. Cut-offs are made from the pattern below (Time & Leave → Setup → Payroll Cut-offs → Generate Year).'
                />
                <Card size='small' title='Rates' style={{ marginBottom: 16 }}>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name='daily_rate_factor'
                        label='Working days a year (daily-rate factor)'
                        extra={`Daily rate = monthly rate × 12 ÷ ${factor || '…'}${FACTOR_HINTS[factor] ? ` — ${FACTOR_HINTS[factor]}` : ''}`}
                        rules={[{ required: true, message: 'Required' }]}
                      >
                        <Select
                          options={(data?.daily_rate_factors || [261, 313, 365]).map((f) => ({ value: f, label: `${f} days — ${FACTOR_HINTS[f]}` }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item name='hours_per_day' label='Hours per day' extra='Hourly rate = daily ÷ this' rules={[{ required: true, message: 'Required' }]}>
                        <InputNumber min={1} max={24} precision={2} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col xs={12} md={6}>
                      <Form.Item name='night_diff_from' label='Night differential from' rules={[{ required: true, message: 'Required' }]}>
                        <TimePicker format='HH:mm' style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Item name='night_diff_to' label='to' rules={[{ required: true, message: 'Required' }]}>
                        <TimePicker format='HH:mm' style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
                <Card size='small' title='Statutory deductions — when taken'>
                  <Typography.Paragraph type='secondary' style={{ marginTop: 0 }}>
                    Every cut-off = the monthly amount split across the month&apos;s cut-offs; otherwise all of it on that cut-off.
                  </Typography.Paragraph>
                  <Row gutter={16}>
                    {AGENCIES.map((a) => (
                      <Col key={a.key} xs={24} sm={12} md={6}>
                        <Form.Item name={a.key} label={a.label} rules={[{ required: true, message: 'Required' }]}>
                          <Select options={(data?.deduction_schedules || []).map((s) => ({ value: s, label: s === 'Every cut-off' ? 'Every cut-off (split)' : `Once a month — ${s}` }))} />
                        </Form.Item>
                      </Col>
                    ))}
                  </Row>
                </Card>
                <Card size='small' title='Cut-offs & Pay Days' style={{ marginTop: 16 }}>
                  <Typography.Paragraph type='secondary' style={{ marginTop: 0 }}>
                    {`Semi-monthly: ${cutoffPatternText(firstDay, secondDay)}, paid on ${payFirst === undefined ? '…' : payDayText(payFirst)} and ${paySecond === undefined ? '…' : payDayText(paySecond)} (the first such date on or after the period ends).`}
                  </Typography.Paragraph>
                  <Row gutter={16}>
                    <Col xs={12} md={6}>
                      <Form.Item name='cutoff_first_day' label='1st cut-off starts on day' rules={[{ required: true, message: 'Required' }]}>
                        <Select options={DAYS_1_28} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Item
                        name='cutoff_second_day'
                        label='2nd cut-off starts on day'
                        dependencies={['cutoff_first_day']}
                        rules={[
                          { required: true, message: 'Required' },
                          ({ getFieldValue }) => ({
                            validator: (_, v) => (v && v === getFieldValue('cutoff_first_day') ? Promise.reject(new Error('Must differ from the 1st')) : Promise.resolve()),
                          }),
                        ]}
                      >
                        <Select options={DAYS_1_28} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Item name='pay_day_first' label='1st cut-off paid on' rules={[{ required: true, message: 'Required' }]}>
                        <Select options={PAY_DAYS} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Item name='pay_day_second' label='2nd cut-off paid on' rules={[{ required: true, message: 'Required' }]}>
                        <Select options={PAY_DAYS} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name='pay_day_adjust'
                        label='Pay day on a Sunday or holiday'
                        rules={[{ required: true, message: 'Required' }]}
                      >
                        <Select options={(data?.pay_day_adjustments || []).map((v) => ({ value: v, label: v === 'None' ? 'Keep the date' : `Move to the ${v.toLowerCase()}` }))} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
                <Card size='small' title='Holiday Pay' style={{ marginTop: 16 }}>
                  <Typography.Paragraph type='secondary' style={{ marginTop: 0 }}>
                    A holiday not worked is never an absence — no deduction, even when on leave (leave credits aren&apos;t used on a holiday). Monthly-paid: covered by the salary. Daily-paid: paid at the day type&apos;s &quot;Paid if Unworked&quot; rate (regular holiday 100%, special holiday 0% — no work, no pay). Work on a holiday is paid at its own regular / overtime rates (Premium Rates).
                  </Typography.Paragraph>
                  <Form.Item
                    name='holiday_pay_needs_prior_day'
                    label='Unworked regular holiday is paid only if present or on paid leave the workday before'
                    valuePropName='checked'
                    extra='The Labor Code rule. Off = always paid.'
                  >
                    <Switch />
                  </Form.Item>
                </Card>
                <Card size='small' title='Overtime' style={{ marginTop: 16 }}>
                  <Typography.Paragraph type='secondary' style={{ marginTop: 0 }}>
                    Only approved overtime is paid. Each filing under the minimum counts 0; the rest is rounded down to whole blocks (e.g. 1 h 50 min per 15 minutes = 1 h 45 min). Overtime before the shift counts when it is approved.
                  </Typography.Paragraph>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item name='ot_minimum_minutes' label='Minimum per filing (minutes)' extra='0 = no minimum' rules={[{ required: true, message: 'Required' }]}>
                        <InputNumber min={0} max={240} precision={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name='ot_rounding_minutes' label='Round down to blocks of' rules={[{ required: true, message: 'Required' }]}>
                        <Select options={[1, 5, 10, 15, 30, 60].map((v) => ({ value: v, label: v === 1 ? 'Every minute (no rounding)' : `${v} minutes` }))} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
                <Card size='small' title='Employer (government forms)' style={{ marginTop: 16 }}>
                  <Typography.Paragraph type='secondary' style={{ marginTop: 0 }}>
                    Printed on the BIR 2316, the alphalist and the remittance reports (Payroll → Government Compliance).
                  </Typography.Paragraph>
                  <Row gutter={12}>
                    <Col xs={24} md={16}>
                      <Form.Item name='employer_name' label='Registered Name'><Input maxLength={150} /></Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item
                        name='employer_tin'
                        label='TIN'
                        rules={[{ pattern: /^[0-9-]*$/, message: 'Digits and dashes only (e.g. 000-123-456-000)' }]}
                      >
                        <Input maxLength={30} placeholder='000-123-456-000' />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={16}>
                      <Form.Item name='employer_address' label='Registered Address'><Input maxLength={255} /></Form.Item>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Item name='employer_zip' label='ZIP Code'><Input maxLength={10} /></Form.Item>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Item name='employer_rdo' label='RDO Code'><Input maxLength={10} /></Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name='employer_sss_no' label='SSS Employer No.'><Input maxLength={30} /></Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name='employer_philhealth_no' label='PhilHealth Employer No.'><Input maxLength={30} /></Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name='employer_pagibig_no' label='Pag-IBIG Employer No.'><Input maxLength={30} /></Form.Item>
                    </Col>
                  </Row>
                </Card>
                <Card
                  size='small'
                  title='Payroll Accounts (paid from)'
                  style={{ marginTop: 16 }}
                  extra={canEdit && <Button size='small' icon={<PlusOutlined />} onClick={() => setEditingAccount({})}>Add Account</Button>}
                >
                  <Typography.Paragraph type='secondary' style={{ marginTop: 0 }}>
                    The company accounts net pay is credited from — one bank file per account. A payroll uses the account whose default period covers its pay date, else the Default one; it can choose another on its Bank File until approved, and keeps what it used. Employees' own accounts are on Payroll → Bank Accounts.
                  </Typography.Paragraph>
                  <Form.Item
                    name='match_employee_bank'
                    label='Pay each bank’s employees from our account at the same bank'
                    valuePropName='checked'
                    extra='e.g. BDO employees from the BDO account, BPI employees from the BPI account; the others from the default. Saved with the settings.'
                  >
                    <Switch />
                  </Form.Item>
                  <Table
                    rowKey='id'
                    size='small'
                    dataSource={data?.accounts || []}
                    pagination={false}
                    scroll={{ x: 720 }}
                    locale={{ emptyText: 'No payroll account yet — the bank file lists credits without a paying account' }}
                    columns={[
                      { title: 'Bank', key: 'bank', render: (_, r) => r.bank?.name || '-' },
                      { title: 'Account No.', dataIndex: 'account_no', width: 160 },
                      { title: 'Account Name', dataIndex: 'account_name', width: 200 },
                      {
                        title: 'Used as default',
                        key: 'default',
                        width: 220,
                        render: (_, r) => (
                          <Space size={4} wrap>
                            {r.is_default && <Tag color='green'>Default</Tag>}
                            {r.default_from && <Tag color='blue'>{`${formatDate(r.default_from)} – ${r.default_to ? formatDate(r.default_to) : 'onward'}`}</Tag>}
                            {!r.is_default && !r.default_from && '-'}
                          </Space>
                        ),
                      },
                      { title: 'Status', dataIndex: 'active', width: 90, render: (v) => (v ? <Tag color='green'>Active</Tag> : <Tag>Inactive</Tag>) },
                      ...(canEdit ? [{
                        title: 'Actions',
                        key: 'actions',
                        width: 90,
                        render: (_, r) => (
                          <Space>
                            <Tooltip title='Edit'>
                              <Button size='small' color='green' variant='outlined' icon={<EditOutlined />} onClick={() => setEditingAccount(r)} />
                            </Tooltip>
                            <Popconfirm
                              title='Delete this payroll account?'
                              description='Approved payrolls keep the account they used. To stop using it, set it inactive instead.'
                              okText='Delete'
                              okButtonProps={{ danger: true }}
                              onConfirm={() => removeAccount(r)}
                            >
                              <Tooltip title='Delete'>
                                <Button size='small' danger icon={<DeleteOutlined />} />
                              </Tooltip>
                            </Popconfirm>
                          </Space>
                        ),
                      }] : []),
                    ]}
                  />
                </Card>
                <Row justify='space-between' align='middle' style={{ marginTop: 16 }} gutter={[8, 8]}>
                  <Col><Typography.Text type='secondary'>{lastSaved}</Typography.Text></Col>
                  {canEdit && (
                    <Col><Button type='primary' icon={<SaveOutlined />} loading={saving} onClick={save}>Save Settings</Button></Col>
                  )}
                </Row>
              </Form>
            ),
          },
          {
            key: 'rates',
            label: 'Premium Rates',
            children: (
              <>
                <Alert
                  type='info'
                  showIcon
                  style={{ marginBottom: 12 }}
                  title="% of the ordinary rate (DOLE premium pay). Regular Hours = the first hours worked that day; Overtime Hour = each approved overtime hour; Night Diff. = added to an hour worked in the night window; Paid if Unworked = the day's pay when not worked (regular holidays)."
                />
                <Table
                  rowKey='day_type'
                  size='small'
                  columns={rateColumns}
                  dataSource={rates}
                  pagination={false}
                  scroll={{ x: 820 }}
                />
                {canEdit && (
                  <div style={{ textAlign: 'right', marginTop: 12 }}>
                    <Button type='primary' icon={<SaveOutlined />} loading={savingRates} onClick={saveRates}>Save Rates</Button>
                  </div>
                )}
              </>
            ),
          },
        ]}
      />
      <CompanyAccountFormModal
        open={!!editingAccount}
        account={editingAccount?.id ? editingAccount : null}
        banks={data?.banks}
        onClose={() => setEditingAccount(null)}
        onSaved={() => { setEditingAccount(null); reloadAccounts(); }}
      />
    </Spin>
  );
};

export default PayrollSettingsPage;
