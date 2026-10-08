import { useState } from 'react';
import {
  Modal, Form, Input, InputNumber, Switch, TimePicker, Button, Row, Col, Table, Typography, Alert, App,
} from 'antd';
import shiftApi from '../../services/shift/shiftApi';
import handleApiError from '../../utils/handleApiError';
import { DAYS, toTime, applyErrors } from './shiftHelpers';

const blankDays = () => DAYS.map((day) => ({ day, is_day_off: day === 'Sunday', time_in: null, time_out: null, break_minutes: 60 }));

// Create/edit a shift pattern: per weekday a day off, or time in / out and
// break minutes (time out before time in = ends the next day, e.g. a night
// shift). `shift` = null for create. A shift already assigned keeps its
// days, hours and grace (changing them would rewrite past schedules — the
// backend refuses it): only code, name, description and active change.
const ShiftFormModal = ({ open, shift, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const days = Form.useWatch('days', form) || [];
  const locked = !!shift?.assigned;

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    form.setFieldsValue(shift ? {
      code: shift.code,
      name: shift.name,
      description: shift.description,
      grace_minutes: shift.grace_minutes,
      active: shift.active,
      days: DAYS.map((day) => {
        const d = shift.days.find((x) => x.day === day) || { is_day_off: true };
        return { day, is_day_off: !!d.is_day_off, time_in: toTime(d.time_in), time_out: toTime(d.time_out), break_minutes: d.break_minutes ?? 0 };
      }),
    } : { grace_minutes: 0, active: true, days: blankDays() });
  };

  // Copy Monday's hours to every other working day.
  const copyMonday = () => {
    const all = form.getFieldValue('days');
    const mon = all[0];
    form.setFieldsValue({
      days: all.map((d, i) => (i === 0 || d.is_day_off ? d : { ...d, time_in: mon.time_in, time_out: mon.time_out, break_minutes: mon.break_minutes })),
    });
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // AntD shows inline field errors
    }
    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description?.trim() || null,
      grace_minutes: values.grace_minutes ?? 0,
      active: values.active,
      days: values.days.map((d, i) => ({
        day: DAYS[i],
        is_day_off: !!d.is_day_off,
        time_in: d.is_day_off ? null : d.time_in?.format('HH:mm') || null,
        time_out: d.is_day_off ? null : d.time_out?.format('HH:mm') || null,
        break_minutes: d.is_day_off ? 0 : d.break_minutes ?? 0,
      })),
    };

    setSaving(true);
    try {
      const { data } = shift ? await shiftApi.update(shift.id, payload) : await shiftApi.create(payload);
      message.success(data.message);
      onSaved();
    } catch (error) {
      // `days.3.time_in` → ['days', 3, 'time_in']
      applyErrors(error, form, message, handleApiError, (key) => (key.startsWith('days.')
        ? key.split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p)) : key));
    } finally {
      setSaving(false);
    }
  };

  const requiredWhenWorking = (index, label) => [{
    validator: (_, value) => (days[index]?.is_day_off || value ? Promise.resolve() : Promise.reject(new Error(`${label} is required`))),
  }];

  const columns = [
    { title: 'Day', key: 'day', width: 110, render: (_, __, i) => DAYS[i] },
    {
      title: 'Day Off',
      width: 80,
      render: (_, __, i) => (
        <Form.Item name={[i, 'is_day_off']} valuePropName='checked' noStyle>
          <Switch
            size='small'
            disabled={locked}
            // a day off needs no times — drop errors left on them
            onChange={() => form.setFields([{ name: ['days', i, 'time_in'], errors: [] }, { name: ['days', i, 'time_out'], errors: [] }])}
          />
        </Form.Item>
      ),
    },
    {
      title: 'Time In',
      render: (_, __, i) => (
        <Form.Item name={[i, 'time_in']} rules={requiredWhenWorking(i, 'Time in')} style={{ margin: 0 }}>
          <TimePicker format='HH:mm' minuteStep={5} disabled={locked || days[i]?.is_day_off} style={{ width: '100%' }} />
        </Form.Item>
      ),
    },
    {
      title: 'Time Out',
      render: (_, __, i) => (
        <Form.Item name={[i, 'time_out']} rules={requiredWhenWorking(i, 'Time out')} style={{ margin: 0 }}>
          <TimePicker format='HH:mm' minuteStep={5} disabled={locked || days[i]?.is_day_off} style={{ width: '100%' }} />
        </Form.Item>
      ),
    },
    {
      title: 'Break (min)',
      width: 110,
      render: (_, __, i) => (
        <Form.Item name={[i, 'break_minutes']} style={{ margin: 0 }}>
          <InputNumber min={0} max={600} step={15} disabled={locked || days[i]?.is_day_off} style={{ width: '100%' }} />
        </Form.Item>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title={shift ? 'Edit Shift' : 'Create Shift'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={780}
    >
      <Form form={form} layout='vertical'>
        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item name='code' label='Code' rules={[{ required: true, whitespace: true, message: 'Code is required' }]}>
              <Input maxLength={30} style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='name' label='Name' rules={[{ required: true, whitespace: true, message: 'Name is required' }]}>
              <Input maxLength={255} placeholder='e.g. Relief Opening 6AM–3PM' />
            </Form.Item>
          </Col>
          <Col xs={12} md={3}>
            <Form.Item name='grace_minutes' label='Grace (min)' tooltip='Minutes after time in before it counts as late.'>
              <InputNumber min={0} max={240} disabled={locked} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={3}>
            <Form.Item name='active' label='Active' valuePropName='checked'><Switch /></Form.Item>
          </Col>
        </Row>
        {locked ? (
          <Alert
            type='info'
            showIcon
            title='This shift has been assigned, so its days, hours and grace are locked — past schedules depend on them. Create a new shift for a different pattern.'
            style={{ marginBottom: 8 }}
          />
        ) : (
          <Typography.Text type='secondary'>
            A time out earlier than the time in ends the next day (night shift).
          </Typography.Text>
        )}
        <Form.List name='days'>
          {(fields) => (
            <Table
              rowKey='key'
              size='small'
              pagination={false}
              dataSource={fields}
              columns={columns}
              scroll={{ x: 560 }}
              style={{ margin: '8px 0 12px' }}
              footer={locked ? undefined : () => <Button size='small' onClick={copyMonday}>Copy Monday to the other working days</Button>}
            />
          )}
        </Form.List>
        <Form.Item name='description' label='Description'>
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ShiftFormModal;
