import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Tabs, Form, InputNumber, Select, TimePicker, Button, Row, Col, Card, Table, Tag, Alert, Typography, Spin, App,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import useAuth from '../../../hooks/useAuth';
import payrollSettingApi from '../../../services/payroll/payrollSettingApi';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import { applyFormErrors } from '../payrollHelpers';
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

// Payroll rules the payroll run reads: the daily-rate factor, hours per day,
// the night-differential window and when each statutory deduction is taken
// (General), and the premium pay per day type (Premium Rates). Paid twice a
// month — the 15th and the end of the month (Payroll Cut-offs).
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
  const factor = Form.useWatch('daily_rate_factor', form);

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
                  title='Paid twice a month — on the 15th and the end of the month (Time & Leave → Setup → Payroll Cut-offs). The payroll run keeps a copy of these settings, so a change applies to runs made after it.'
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
    </Spin>
  );
};

export default PayrollSettingsPage;
