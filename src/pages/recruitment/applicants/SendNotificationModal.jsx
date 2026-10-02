import { useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Checkbox, DatePicker, Select, Input, Row, Col, Alert, Tag, Space, Typography, App } from 'antd';

import recruitmentApi from '../../../services/recruitment/recruitmentApi';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import { gatewayMessage, errorMessage } from './requirements';
import { INVITATION_TYPES, NOTIFICATION_LABELS, TIME_OPTIONS, SCHEDULE_DATE_FIELD } from './notifications';

const CHANNELS = { EMAIL: 'Email', SMS: 'SMS' };

// Email / SMS to the applicant (Phase 4). Used right after a status save
// (`afterSave`) and from the progress card's envelope to resend one that
// failed. Invitation emails need the schedule first. Each channel's result
// is shown; a channel that went through is unticked, so pressing Send again
// retries only what failed.
export default function SendNotificationModal({
  open, applicant, step, notifType, scheduleDate, maps, canEmail, canSms, afterSave, onClose,
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState([]);
  const channels = Form.useWatch('channels', form) || [];

  const isInvitation = INVITATION_TYPES.includes(notifType);
  const needsSchedule = isInvitation && channels.includes('EMAIL');
  const allowed = Object.keys(CHANNELS).filter((c) => (c === 'EMAIL' ? canEmail : canSms));

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) {
      setResults([]);
      return;
    }
    form.resetFields();
    // The date just saved (the drawer may not have reloaded yet), else the stage's.
    const scheduled = scheduleDate || applicant?.[SCHEDULE_DATE_FIELD[notifType]];
    form.setFieldsValue({
      channels: allowed,
      date: scheduled && !dayjs(scheduled).isBefore(dayjs(), 'day') ? dayjs(scheduled) : null,
    });
  };

  // Email's `position` = first position preference, else the one applied for.
  const position = () => {
    const first = String(applicant?.position_preference || '').split(',')[0].trim();
    return (first && maps?.positions?.[first]) || applicant?.position_name || '';
  };

  const send = async (values) => {
    const payload = {
      applicant_id: applicant.id,
      step,
      notif_type: notifType,
      position: position(),
      ...(needsSchedule ? {
        date: values.date.format('YYYY-MM-DD'),
        time: values.time,
        venue: values.venue,
        facilitator: values.facilitator,
        facilitator_position: values.facilitator_position,
        deadline_date: values.deadline_date ? values.deadline_date.format('YYYY-MM-DD') : null,
      } : {}),
    };
    setSending(true);
    const done = [];
    // Email first, then SMS — the portal's order.
    for (const channel of ['EMAIL', 'SMS'].filter((c) => values.channels.includes(c))) {
      try {
        const { data } = await (channel === 'EMAIL' ? recruitmentApi.sendEmail(payload) : recruitmentApi.sendSms(payload));
        const ok = typeof data?.success === 'string';
        done.push({ channel, ok, text: ok ? data.success : gatewayMessage(data, `${CHANNELS[channel]} was not sent.`) });
      } catch (err) {
        done.push({ channel, ok: false, text: errorMessage(err, `${CHANNELS[channel]} was not sent.`) });
      }
    }
    setSending(false);
    setResults(done);
    if (done.every((r) => r.ok)) {
      message.success('Notification sent.');
      onClose();
      return;
    }
    form.setFieldsValue({ channels: done.filter((r) => !r.ok).map((r) => r.channel) });
  };

  const handleSend = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    send(values);
  };

  const notPast = (current) => current && current.isBefore(dayjs(), 'day');
  const req = (msg) => [{ required: true, whitespace: true, message: msg }];

  return (
    <Modal
      open={open}
      title={afterSave ? 'Status updated — notify the applicant?' : 'Send Notification'}
      width={needsSchedule ? 680 : 480}
      destroyOnHidden
      afterOpenChange={handleAfterOpenChange}
      onCancel={onClose}
      onOk={handleSend}
      okText={results.length ? 'Send again' : 'Send'}
      cancelText={afterSave && !results.length ? 'Skip' : 'Close'}
      confirmLoading={sending}
      mask={{ closable: false }}
    >
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        <Space wrap size={6}>
          <Typography.Text type="secondary">Notification:</Typography.Text>
          <Tag color="cyan">{NOTIFICATION_LABELS[notifType] || notifType}</Tag>
        </Space>
        <Typography.Text type="secondary">
          To {applicant?.email || 'no email on file'} · {applicant?.contact_no || 'no mobile on file'}
        </Typography.Text>

        {results.map((r) => (
          <Alert key={r.channel} type={r.ok ? 'success' : 'error'} showIcon title={`${CHANNELS[r.channel]}: ${r.text}`} />
        ))}

        <Form form={form} layout="vertical">
          <Form.Item name="channels" label="Send by" rules={[{ required: true, type: 'array', min: 1, message: 'Pick at least one.' }]}>
            <Checkbox.Group options={allowed.map((c) => ({ value: c, label: CHANNELS[c] }))} />
          </Form.Item>

          {needsSchedule && (
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Date is required.' }]}>
                  <DatePicker format={DISPLAY_DATE_FORMAT} disabledDate={notPast} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="time" label="Time" rules={[{ required: true, message: 'Time is required.' }]}>
                  <Select options={TIME_OPTIONS} placeholder="Select time" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="venue" label="Venue" rules={req('Venue is required.')}>
                  <Input maxLength={255} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="facilitator" label="Assessment Facilitator" rules={req('Facilitator is required.')}>
                  <Input maxLength={255} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="facilitator_position" label="Facilitator Position" rules={req('Facilitator Position is required.')}>
                  <Input maxLength={255} />
                </Form.Item>
              </Col>
              {notifType === 'invitation_bm_interview' && (
                <Col xs={24} md={12}>
                  <Form.Item name="deadline_date" label="Deadline Date" rules={[{ required: true, message: 'Deadline Date is required.' }]}>
                    <DatePicker format={DISPLAY_DATE_FORMAT} disabledDate={notPast} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              )}
            </Row>
          )}
        </Form>
      </Space>
    </Modal>
  );
}
